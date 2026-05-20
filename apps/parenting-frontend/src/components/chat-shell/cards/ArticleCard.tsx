import { Icon } from '../../icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';
import { CardActionsRow } from './CardActions.js';
import type { CardActionHandlers, ArticleCardData, CardAction } from './types.js';

type Props = {
  data: ArticleCardData;
  actions?: CardAction[];
  handlers: CardActionHandlers;
};

export function ArticleCard({ data, actions, handlers }: Props) {
  return (
    <button
      type="button"
      onClick={() => handlers.onNavigate(`/app/resources/${data.slug}`)}
      className="group w-full rounded-2xl border border-border bg-surface p-3.5 text-left transition-all hover:border-brand-blue/40 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 group-hover:bg-brand-blue/25 transition-colors">
          <Icon name={uiIcons.bookOpen} className="h-5 w-5 object-contain" alt="" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-brand-blue">
            Article
          </div>
          <div className="mt-0.5 text-[15px] font-bold text-text-primary leading-tight group-hover:text-brand-blue transition-colors">
            {data.title}
          </div>
          {data.excerpt && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-text-secondary">
              {data.excerpt}
            </p>
          )}
        </div>
        <Icon
          name={uiIcons.chevronRight}
          className="mt-1 h-4 w-4 flex-shrink-0 object-contain opacity-50 transition-transform group-hover:translate-x-0.5"
          alt=""
        />
      </div>
      {actions && actions.length > 1 && (
        <div onClick={(e) => e.stopPropagation()}>
          <CardActionsRow actions={actions.slice(1)} handlers={handlers} />
        </div>
      )}
    </button>
  );
}
