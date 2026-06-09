"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SignatureModalProps {
  contractId: string;
  open: boolean;
  onClose: () => void;
  onSigned: () => void;
}

export function SignatureModal({ contractId, open, onClose, onSigned }: SignatureModalProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kycApproved = user?.kycStatus === "APPROVED";

  const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
    setHasStroke(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#001b3c";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw() {
    setDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  }

  async function handleSign() {
    if (!hasStroke || !legalAccepted) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/api/v3/contracts/${contractId}/sign`, { method: "POST" });
      onSigned();
      onClose();
      clearCanvas();
      setLegalAccepted(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-tenant-blue text-[20px]">חתימה דיגיטלית</DialogTitle>
          <DialogDescription>חתום בתוך המסגרת לאישור החוזה</DialogDescription>
        </DialogHeader>

        {!kycApproved ? (
          <div className="text-center py-6 space-y-4">
            <span className="material-symbols-outlined text-[48px] text-[#856404]">verified_user</span>
            <p className="text-[14px] text-on-surface-variant">
              יש לאמת את הזהות (KYC) לפני חתימה על חוזה.
            </p>
            <Link
              href="/profile"
              className="inline-flex h-[48px] items-center px-8 bg-landlord-green text-white font-bold rounded-full"
            >
              מעבר לאימות זהות
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-outline-variant rounded-xl overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={400}
                height={160}
                className="w-full h-40 touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            <button
              type="button"
              onClick={clearCanvas}
              className="text-[13px] text-on-surface-variant hover:text-tenant-blue"
            >
              נקה חתימה
            </button>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 accent-landlord-green"
              />
              <span className="text-[14px] text-tenant-blue">אני מאשר/ת שחתימה זו מחייבת</span>
            </label>

            {error && (
              <p className="text-[13px] text-[#c62828]">{error}</p>
            )}

            <button
              type="button"
              disabled={loading || !hasStroke || !legalAccepted}
              onClick={handleSign}
              className="w-full h-[48px] bg-landlord-green text-white font-bold rounded-full disabled:opacity-50"
            >
              {loading ? "חותם..." : "אשר וחתום"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
