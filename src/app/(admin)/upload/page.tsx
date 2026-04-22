"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

type FileStatus = "waiting" | "processing" | "complete" | "error";

type QueueItem = {
  id: string;
  file: File;
  status: FileStatus;
  log: string[];
  publicUrl?: string;
};

type StreamEvent = {
  step: string;
  msg: string;
  publicUrl?: string;
};

const STATUS_LABEL: Record<FileStatus, string> = {
  waiting: "WAITING",
  processing: "PROCESSING",
  complete: "COMPLETE",
  error: "ERROR",
};

const STATUS_COLOR: Record<FileStatus, string> = {
  waiting: "text-[#6b7280]",
  processing: "text-[#facc15]",
  complete: "text-[#4ade80]",
  error: "text-[#f87171]",
};

function logLineColor(line: string): string {
  if (line.includes("COMPLETE") || line.includes("... OK")) return "text-[#4ade80]";
  if (line.includes("ERROR") || line.includes("ERR")) return "text-[#f87171]";
  return "text-[#facc15]";
}

export default function UploadPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [queue]);

  const updateItemById = useCallback(
    (id: string, update: Partial<QueueItem> | ((prev: QueueItem) => Partial<QueueItem>)) => {
      setQueue((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const updates = typeof update === "function" ? update(item) : update;
          return { ...item, ...updates };
        }),
      );
    },
    [],
  );

  const processFile = useCallback(
    async (id: string, file: File) => {
      updateItemById(id, { status: "processing" });

      const formData = new FormData();
      formData.append("file", file);

      let response: Response;
      try {
        response = await fetch("/api/admin/process-image", {
          method: "POST",
          body: formData,
        });
      } catch (err) {
        updateItemById(id, { status: "error", log: [`> NET_ERR: ${String(err)}`] });
        return;
      }

      if (!response.ok || !response.body) {
        updateItemById(id, (prev) => ({
          status: "error",
          log: [...prev.log, `> HTTP_ERR: ${response.status}`],
        }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partial = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partial += decoder.decode(value, { stream: true });
        const lines = partial.split("\n");
        partial = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event: StreamEvent = JSON.parse(line);
            if (event.step === "COMPLETE") {
              updateItemById(id, (prev) => ({
                status: "complete",
                log: [...prev.log, event.msg],
                publicUrl: event.publicUrl,
              }));
            } else if (event.step === "ERROR") {
              updateItemById(id, (prev) => ({
                status: "error",
                log: [...prev.log, event.msg],
              }));
            } else {
              updateItemById(id, (prev) => ({ log: [...prev.log, event.msg] }));
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    },
    [updateItemById],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const files = acceptedFiles
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, 20);
      if (!files.length) return;

      const newItems: QueueItem[] = files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        status: "waiting" as const,
        log: [],
      }));

      setQueue((prev) => [...prev, ...newItems]);

      for (const item of newItems) {
        await processFile(item.id, item.file);
      }
    },
    [processFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 20,
    multiple: true,
  });

  const completed = queue.filter((i) => i.status === "complete").length;
  const errored = queue.filter((i) => i.status === "error").length;
  const total = queue.length;
  const isProcessing = queue.some((i) => i.status === "processing");

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
          // BATCH_UPLOAD_PROTOCOL
        </p>
      </div>

      {/* Terminal window */}
      <div className="border border-[#222] bg-[#0d0d0d] font-mono text-[12px]">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-[#222] px-4 py-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[10px] uppercase tracking-[0.15em] text-[#4b5563]">
            BATCH_UPLOAD_PROTOCOL — METALLURG_CONTROL_ROOM
          </span>
        </div>

        <div className="p-5">
          {/* Boot line */}
          <p className="mb-5 text-[#4ade80]">[BATCH_UPLOAD_INIT]</p>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`mb-6 cursor-pointer border border-dashed p-10 text-center transition-colors ${
              isDragActive
                ? "border-[#4ade80] bg-[#0a1a0a]"
                : "border-[#333] hover:border-[#555]"
            } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
          >
            <input {...getInputProps()} />
            <p className="tracking-[0.08em] text-[#9ca3af]">
              {isDragActive ? "DROP_UNITS_HERE..." : "DRAG_AND_DROP_IMAGE_FILES_HERE"}
            </p>
            <p className="mt-1.5 text-[10px] text-[#4b5563]">
              PNG / JPEG · MAX 20 FILES PER BATCH
            </p>
          </div>

          {/* Queue log */}
          {queue.length > 0 && (
            <div className="space-y-5">
              {queue.map((item) => (
                <div key={item.id}>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${STATUS_COLOR[item.status]}`}>
                      [{STATUS_LABEL[item.status]}]
                    </span>
                    <span className="text-[#e5e5e5]">{item.file.name}</span>
                  </div>
                  {item.log.map((line, i) => (
                    <p key={i} className={`mt-0.5 pl-4 text-[11px] ${logLineColor(line)}`}>
                      {line}
                    </p>
                  ))}
                  {item.status === "complete" && item.publicUrl && (
                    <div className="mt-1.5 pl-4 flex items-center gap-2">
                      <span className="text-[11px] text-[#4ade80] truncate max-w-[420px]">
                        {item.publicUrl}
                      </span>
                      <button
                        onClick={() => void navigator.clipboard.writeText(item.publicUrl!)}
                        className="shrink-0 border border-[#333] px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-[#6b7280] hover:border-[#4ade80] hover:text-[#4ade80] transition-colors"
                      >
                        COPY
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}

          {/* Progress footer */}
          {total > 0 && (
            <div className="mt-6 flex items-center justify-between border-t border-[#1a1a1a] pt-4">
              <p className="text-[11px] text-[#6b7280]">
                <span className="text-[#9ca3af]">Processed:</span>{" "}
                <span className="text-[#e5e5e5]">
                  {completed + errored}/{total}
                </span>
                {errored > 0 && (
                  <span className="ml-3 text-[#f87171]">{errored} error{errored > 1 ? "s" : ""}</span>
                )}
              </p>
              {!isProcessing && total > 0 && (
                <button
                  onClick={() => setQueue([])}
                  className="text-[10px] uppercase tracking-[0.15em] text-[#4b5563] transition-colors hover:text-[#9ca3af]"
                >
                  CLEAR_LOG
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
