"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Modal, ModalFooter } from "@/components/modal";
import { Button, ButtonLink, cn } from "@/components/ui";
import {
  IMAGE_TYPES,
  KYC_DOCS,
  MAX_DOCUMENT_BYTES,
  PDF_TYPE,
  isDocComplete,
  type KycDocumentInfo,
  type KycSlotDef,
} from "@/lib/kyc";

export function DocumentStep({
  type,
  initialDocuments,
  backHref,
  nextHref,
}: {
  type: string;
  initialDocuments: KycDocumentInfo[];
  backHref?: string;
  nextHref: string;
}) {
  const def = KYC_DOCS.find((d) => d.type === type)!;
  const [documents, setDocuments] = useState(initialDocuments);
  const find = (slot: string) => documents.find((d) => d.slot === slot);
  const frontIsPdf = find("FRONT")?.mimeType === PDF_TYPE;
  const complete = isDocComplete(def, documents);

  return (
    <div className="mt-5 space-y-4">
      <section className="space-y-4">
        {def.slots
          .filter((s) => !(s.slot === "BACK" && frontIsPdf))
          .map((s) => (
            <DocumentSlot
              key={s.slot}
              type={def.type}
              def={s}
              showLabel={def.slots.length > 1}
              document={find(s.slot)}
              onUploaded={(doc, removedId) =>
                setDocuments((all) => [...all.filter((d) => d.slot !== doc.slot && d.id !== removedId), doc])
              }
              onRemoved={(id) => setDocuments((all) => all.filter((d) => d.id !== id))}
            />
          ))}
        {frontIsPdf && def.slots.length > 1 && <p className="text-sm text-muted">Your PDF covers both sides.</p>}
      </section>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6">
        {backHref && (
          <ButtonLink href={backHref} variant="secondary" className="py-3 text-base">
            Back
          </ButtonLink>
        )}
        {complete ? (
          <ButtonLink href={nextHref} prefetch={false} className="flex-1 py-3 text-base">
            Continue
          </ButtonLink>
        ) : (
          <Button disabled className="flex-1 py-3 text-base">
            Add your document to continue
          </Button>
        )}
      </div>
    </div>
  );
}

function DocumentSlot({
  type,
  def,
  showLabel,
  document: doc,
  onUploaded,
  onRemoved,
}: {
  type: string;
  def: KycSlotDef;
  showLabel: boolean;
  document?: KycDocumentInfo;
  onUploaded: (doc: KycDocumentInfo, removedId: string | null) => void;
  onRemoved: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const captureInput = useRef<HTMLInputElement>(null);
  const accept = (def.imagesOnly ? IMAGE_TYPES : [...IMAGE_TYPES, PDF_TYPE]).join(",");

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError("That file is too large. The limit is 10 MB.");
      return;
    }
    setBusy(true);
    try {
      const post = (path: string, body: object) =>
        fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      const link = await post("/api/kyc/upload-link", { type, slot: def.slot, size: file.size });
      const { url, storageKey, error: linkError } = await link.json().catch(() => ({}));
      if (!link.ok) {
        setError(linkError ?? "Upload failed. Please try again.");
        return;
      }

      const sent = await fetch(url, { method: "PUT", body: file });
      if (!sent.ok) {
        setError("Upload failed. Please try again.");
        return;
      }

      const res = await post("/api/kyc", { type, slot: def.slot, storageKey, fileName: file.name });
      const json = await res.json().catch(() => null);
      if (!res.ok) setError(json?.error ?? "Upload failed. Please try again.");
      else onUploaded(json.document, json.removedId);
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!doc) return;
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/kyc/${doc.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (res?.ok) onRemoved(doc.id);
    else setError("Couldn't remove the file. Please try again.");
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) upload(file);
  };

  // Phones open their own camera app, which gives the sharpest photo; computers use the webcam.
  const openCamera = () => {
    if (window.matchMedia("(pointer: coarse)").matches) captureInput.current?.click();
    else setCameraOpen(true);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  return (
    <div>
      {showLabel && <p className="mb-1.5 text-sm font-medium">{def.label}</p>}
      {doc ? (
        <div className="animate-pop flex items-center gap-3 rounded-xl border border-up/30 bg-up/5 p-2.5">
          <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2 text-xs font-semibold text-muted">
            {IMAGE_TYPES.includes(doc.mimeType) ? (
              <Image src={`/api/kyc/${doc.id}`} alt="" fill unoptimized className="object-cover" />
            ) : (
              "PDF"
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{doc.fileName}</p>
            <p className="flex items-center gap-1 text-xs text-up">
              <span aria-hidden>✓</span> Uploaded
            </p>
          </div>
          <a
            href={`/api/kyc/${doc.id}`}
            target="_blank"
            rel="noopener"
            className="px-2 py-3 text-sm text-muted hover:text-foreground"
          >
            View
          </a>
          <button type="button" onClick={remove} disabled={busy} className="px-2 py-3 text-sm text-muted hover:text-danger disabled:opacity-50">
            Remove
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn("rounded-xl border border-dashed p-2.5 transition-colors", dragging ? "border-brand bg-brand/10" : "border-line")}
        >
          {busy ? (
            <p className="py-3 text-center text-sm text-muted" role="status">
              Uploading…
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={openCamera}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 text-sm font-medium hover:bg-line"
              >
                <svg viewBox="0 0 24 24" className="size-5 text-brand" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
                </svg>
                Use camera
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 text-sm font-medium hover:bg-line"
              >
                <svg viewBox="0 0 24 24" className="size-5 text-brand" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
                </svg>
                Upload file
              </button>
            </div>
          )}
        </div>
      )}
      <input ref={fileInput} type="file" accept={accept} onChange={onPick} className="hidden" aria-label={`Upload ${def.label}`} />
      <input ref={captureInput} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" aria-label={`Take a photo of ${def.label}`} />
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
      <CameraModal
        open={cameraOpen}
        title={def.label}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => {
          setCameraOpen(false);
          upload(file);
        }}
        onUnavailable={() => {
          setCameraOpen(false);
          setError("We couldn't open a camera. Allow camera access, or choose Upload file instead.");
        }}
      />
    </div>
  );
}

function CameraModal({
  open,
  title,
  onClose,
  onCapture,
  onUnavailable,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onCapture: (file: File) => void;
  onUnavailable: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Scan with camera" description={title}>
      <CameraView onCapture={onCapture} onUnavailable={onUnavailable} />
    </Modal>
  );
}

function CameraView({ onCapture, onUnavailable }: { onCapture: (file: File) => void; onUnavailable: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    (navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } } }) ?? Promise.reject())
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(onUnavailable);
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // The camera should only start once, when this view mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  const capture = () => {
    const v = video.current;
    if (!v?.videoWidth) return;
    const canvas = window.document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob((blob) => blob && setShot({ blob, url: URL.createObjectURL(blob) }), "image/jpeg", 0.92);
  };

  return (
    <>
      <div className="relative aspect-[4/3] bg-black">
        {/* The live view stays mounted behind the preview so Retake is instant. */}
        <video ref={video} autoPlay playsInline muted className="absolute inset-0 size-full object-contain" />
        {shot && <Image src={shot.url} alt="Captured document" fill unoptimized className="object-contain" />}
      </div>
      <p className="px-5 pt-3 text-sm text-muted">Lay the document flat in good light, with all four corners visible.</p>
      <ModalFooter>
        {shot ? (
          <>
            <Button type="button" variant="secondary" onClick={() => setShot(null)}>
              Retake
            </Button>
            <Button type="button" onClick={() => onCapture(new File([shot.blob], "camera-scan.jpg", { type: "image/jpeg" }))}>
              Use this photo
            </Button>
          </>
        ) : (
          <Button type="button" onClick={capture}>
            Take photo
          </Button>
        )}
      </ModalFooter>
    </>
  );
}
