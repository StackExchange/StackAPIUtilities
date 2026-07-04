import type { RunQueueItem } from "../domain/types";

export function RunStatus({ queue }: { queue: RunQueueItem[] }) {
  if (queue.length === 0) {
    return null;
  }

  return (
    <section className="s-notice s-notice__info mt16" aria-label="Run status">
      <ul className="m0">
        {queue.map((item) => (
          <li key={item.id}>{item.message}</li>
        ))}
      </ul>
    </section>
  );
}
