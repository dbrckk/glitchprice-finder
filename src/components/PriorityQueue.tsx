import type { DealSignal } from "../types";
import { formatCurrency, getOpportunityScore, getSavings } from "../utils/dealScoring";

interface PriorityQueueProps {
  deals: DealSignal[];
  watchlist: string[];
  onToggleWatchlist: (dealId: string) => void;
}

export function PriorityQueue({ deals, watchlist, onToggleWatchlist }: PriorityQueueProps) {
  if (!deals.length) {
    return null;
  }

  return (
    <section className="priority-queue" aria-label="File prioritaire des deals">
      <div className="section-heading section-heading--inline">
        <div>
          <p className="eyebrow">Priorité opérationnelle</p>
          <h2>Top deals à traiter maintenant</h2>
        </div>
        <span>{deals.length} signaux classés</span>
      </div>

      <div className="priority-queue__list">
        {deals.map((deal, index) => {
          const isTracked = watchlist.includes(deal.id);

          return (
            <article key={deal.id} className="priority-card">
              <span className="priority-card__rank">{String(index + 1).padStart(2, "0")}</span>
              <div className="priority-card__body">
                <p>{deal.merchant}</p>
                <strong>{deal.title}</strong>
                <small>
                  Score {getOpportunityScore(deal)} - {deal.discountPercent}% - économie {formatCurrency(getSavings(deal), deal.currency)}
                </small>
              </div>
              <div className="priority-card__actions">
                <a href={deal.url} target="_blank" rel="noreferrer">
                  Ouvrir
                </a>
                <button type="button" className={isTracked ? "is-active" : ""} onClick={() => onToggleWatchlist(deal.id)}>
                  {isTracked ? "Suivi" : "Suivre"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
