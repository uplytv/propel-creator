import { useState } from "react";
import { X } from "lucide-react";

interface HeydarModalProps {
  count: number;
  onClose: () => void;
}

const tokenOptions = [
  { tokens: 1, price: "$7.99", savings: null },
  { tokens: 3, price: "$18.99", savings: "Save 21%" },
  { tokens: 5, price: "$26.99", savings: "Save 32%" },
];

export default function HeydarModal({ count, onClose }: HeydarModalProps) {
  const [selectedTokens, setSelectedTokens] = useState(1);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[99]"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100]"
        style={{
          background: "#141414",
          borderRadius: "20px 20px 0 0",
          padding: "16px 20px 40px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.2)",
            margin: "0 auto 20px",
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Count + title */}
        <div className="mb-4">
          <span style={{ fontSize: 32, fontWeight: 900, color: "#00FF85" }}>
            {count}
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#FFFFFF",
              marginLeft: 8,
            }}
          >
            People Heyed you locally
          </span>
        </div>

        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.5,
            marginBottom: 20,
          }}
        >
          Use Heydar to see everyone who Heyed you nearby, and in ALL local
          events!
        </p>

        {/* Activate button */}
        <button
          style={{
            width: "100%",
            height: 52,
            background: "#00FF85",
            borderRadius: 12,
            border: "none",
            fontSize: 15,
            fontWeight: 800,
            color: "#0A0A0A",
            cursor: "pointer",
            marginBottom: 4,
          }}
        >
          ACTIVATE LOCAL HEYDAR
        </button>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            marginBottom: 16,
          }}
        >
          1 Token for 7 Days
        </p>

        {/* Token balance */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#FFFFFF",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          You have 3 Tokens
        </p>

        {/* Premium card */}
        <div
          style={{
            background: "linear-gradient(135deg, #00C9B1, #0066FF)",
            borderRadius: 14,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>
            UPLY Premium
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
            1 Token/month + more
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
            starts at $5.83/month
          </p>
        </div>

        {/* Token purchase options */}
        <div className="flex gap-3">
          {tokenOptions.map((opt) => {
            const isSelected = selectedTokens === opt.tokens;
            return (
              <button
                key={opt.tokens}
                onClick={() => setSelectedTokens(opt.tokens)}
                className="flex-1 flex flex-col items-center gap-1"
                style={{
                  border: `1px solid ${isSelected ? "#00FF85" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 12,
                  padding: "16px 8px",
                  background: isSelected
                    ? "rgba(0,255,133,0.06)"
                    : "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{ fontSize: 16, fontWeight: 800, color: "#FFFFFF" }}
                >
                  {opt.tokens} Token{opt.tokens > 1 ? "s" : ""}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {opt.price}
                </span>
                {opt.savings && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#00FF85",
                    }}
                  >
                    {opt.savings}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
