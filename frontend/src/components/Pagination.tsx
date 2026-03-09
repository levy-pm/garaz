interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange }: Props) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>Wyświetlanie {start}–{end} z {total}</span>
        <select className="per-page-select" value={limit} onChange={e => onLimitChange(Number(e.target.value))}>
          <option value={10}>10 na stronę</option>
          <option value={25}>25 na stronę</option>
          <option value={50}>50 na stronę</option>
        </select>
      </div>
      <div className="pagination-controls">
        <button className="pagination-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ‹ Poprzednia
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let p: number;
          if (totalPages <= 5) {
            p = i + 1;
          } else if (page <= 3) {
            p = i + 1;
          } else if (page >= totalPages - 2) {
            p = totalPages - 4 + i;
          } else {
            p = page - 2 + i;
          }
          return (
            <button
              key={p}
              className={`pagination-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          );
        })}
        <button className="pagination-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Następna ›
        </button>
      </div>
    </div>
  );
}
