import type {
  Card,
  ChildCardData,
  EventCardData,
  ChecklistCardData,
  ArticleCardData,
  ConfirmCardData,
  CardAction,
} from "./types.js";

export function childCard(data: ChildCardData, opts?: { extraActions?: CardAction[] }): Card {
  return {
    id: `child-${data.childId}`,
    type: "child",
    data,
    actions: [
      { kind: "navigate", label: `Open ${data.name}`, to: `/settings`, tone: "primary" },
      ...(opts?.extraActions ?? []),
    ],
  };
}

export function eventCard(data: EventCardData, opts?: { extraActions?: CardAction[] }): Card {
  return {
    id: `event-${data.eventId}`,
    type: "event",
    data,
    actions: [
      { kind: "navigate", label: "Open calendar", to: "/calendar", tone: "primary" },
      ...(opts?.extraActions ?? []),
    ],
  };
}

export function checklistCard(id: string, data: ChecklistCardData): Card {
  return {
    id: `checklist-${id}`,
    type: "checklist",
    data,
  };
}

export function articleCard(data: ArticleCardData): Card {
  return {
    id: `article-${data.slug}`,
    type: "article",
    data,
    actions: [
      { kind: "navigate", label: "Read article", to: `/articles/${data.slug}`, tone: "primary" },
    ],
  };
}

export function confirmCard(id: string, data: ConfirmCardData): Card {
  return {
    id: `confirm-${id}`,
    type: "confirm",
    data,
  };
}

export function ageLabelFromBirthday(
  birthday: Date | string | null | undefined,
  isUnborn?: boolean,
  dueDate?: Date | string | null,
): string {
  if (isUnborn) {
    if (!dueDate) return "expected";
    const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
    return `due ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  if (!birthday) return "age unknown";
  const b = typeof birthday === "string" ? new Date(birthday) : birthday;
  const months = Math.floor((Date.now() - b.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
  if (months < 1) return "newborn";
  if (months < 24) return `${months} mo`;
  const years = Math.floor(months / 12);
  return `${years} yr${years === 1 ? "" : "s"}`;
}
