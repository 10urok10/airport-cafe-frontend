// Uc ayri form (stok duzelt / yeni malzeme / duzenle) icin ortak bir
// pencere kabugu. Arka plana tiklamak veya X'e basmak kapatir.
export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
