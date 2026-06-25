// src/components/NotificationModal.tsx

interface NotificationModalProps {
  isOpen: boolean;
  type: "success" | "error" | "warning";
  title: string;
  message: string;
  onClose: () => void;
}

export default function NotificationModal({ isOpen, type, title, message, onClose }: NotificationModalProps) {
  if (!isOpen) return null;

  // Configuração de cores e emojis baseados no tipo do evento
  const config = {
    success: {
      emoji: "🎉",
      borderColor: "border-emerald-500",
      buttonColor: "bg-emerald-600 hover:bg-emerald-700"
    },
    error: {
      emoji: "❌",
      borderColor: "border-red-500",
      buttonColor: "bg-red-600 hover:bg-red-700"
    },
    warning: {
      emoji: "⚠️",
      borderColor: "border-amber-500",
      buttonColor: "bg-amber-600 hover:bg-amber-700"
    }
  };

  const current = config[type] || config.success;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className={`w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border-t-4 ${current.borderColor} text-center flex flex-col items-center animate-fade-in`}>
        
        {/* Emoji Gigante com Anel de Destaque */}
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-4 shadow-inner select-none">
          {current.emoji}
        </div>

        {/* Textos com Alto Contraste */}
        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">
          {message}
        </p>

        {/* Botão de Confirmação */}
        <button
          type="button"
          onClick={onClose}
          className={`w-full mt-5 rounded-xl ${current.buttonColor} px-4 py-2.5 text-xs font-extrabold text-white transition-colors cursor-pointer shadow-sm`}
        >
          Entendido
        </button>

      </div>
    </div>
  );
}