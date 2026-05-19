import { ChildCard } from './ChildCard.js';
import { EventCard } from './EventCard.js';
import { ChecklistCard } from './ChecklistCard.js';
import { ArticleCard } from './ArticleCard.js';
import { LessonCard } from './LessonCard.js';
import { ConfirmCard } from './ConfirmCard.js';
import type { Card, CardActionHandlers } from './types.js';

type Props = {
  cards: Card[];
  handlers: CardActionHandlers;
};

export function CardRenderer({ cards, handlers }: Props) {
  if (!cards.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {cards.map((c) => {
        switch (c.type) {
          case 'child':
            return <ChildCard key={c.id} data={c.data} actions={c.actions} handlers={handlers} />;
          case 'event':
            return <EventCard key={c.id} data={c.data} actions={c.actions} handlers={handlers} />;
          case 'checklist':
            return (
              <ChecklistCard
                key={c.id}
                id={c.id}
                data={c.data}
                actions={c.actions}
                handlers={handlers}
              />
            );
          case 'article':
            return <ArticleCard key={c.id} data={c.data} actions={c.actions} handlers={handlers} />;
          case 'lesson':
            return <LessonCard key={c.id} data={c.data} />;
          case 'confirm':
            return <ConfirmCard key={c.id} id={c.id} data={c.data} handlers={handlers} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
