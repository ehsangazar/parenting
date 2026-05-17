/** Course navigation: phase order, then module order, then lesson order. */

export interface OrderedModuleLike {
  id: string;
  order: number;
  completedLessons?: number;
  _count?: { lessons?: number };
  phase?: { order?: number; course?: { id: string } };
  minAgeMonths?: number | null;
  maxAgeMonths?: number | null;
}

export function moduleIsComplete(
  m: Pick<OrderedModuleLike, 'completedLessons' | '_count'>,
): boolean {
  const total = m._count?.lessons ?? 0;
  if (total === 0) return true;
  return (m.completedLessons ?? 0) >= total;
}

export function sortModulesForCourse(
  modules: OrderedModuleLike[],
  courseId: string,
): OrderedModuleLike[] {
  return modules
    .filter((m) => m.phase?.course?.id === courseId)
    .sort((a, b) => {
      const po = (a.phase?.order ?? 0) - (b.phase?.order ?? 0);
      if (po !== 0) return po;
      return (a.order ?? 0) - (b.order ?? 0);
    });
}

/** First module with an incomplete lesson, or first module if the course is fully done. */
export function getFirstActionableModuleId(
  modules: OrderedModuleLike[],
  courseId: string,
): string | null {
  const ordered = sortModulesForCourse(modules, courseId);
  if (ordered.length === 0) return null;
  const incomplete = ordered.find((m) => !moduleIsComplete(m));
  return incomplete?.id ?? ordered[0].id;
}

export interface PhaseWithOrderedModules {
  order: number;
  modules: OrderedModuleLike[];
}

export function orderedModulesFromPhases(phases: PhaseWithOrderedModules[]): OrderedModuleLike[] {
  return [...phases]
    .sort((a, b) => a.order - b.order)
    .flatMap((p) => [...p.modules].sort((a, b) => a.order - b.order));
}

export function isModuleLockedInOrderedList(
  modId: string,
  ordered: Pick<OrderedModuleLike, 'id' | 'completedLessons' | '_count'>[],
): boolean {
  const idx = ordered.findIndex((m) => m.id === modId);
  if (idx <= 0) return false;
  for (let i = 0; i < idx; i++) {
    if (!moduleIsComplete(ordered[i])) return true;
  }
  return false;
}

export function getFirstActionableModuleIdFromOrdered(
  ordered: Pick<OrderedModuleLike, 'id' | 'completedLessons' | '_count'>[],
): string | null {
  if (ordered.length === 0) return null;
  const incomplete = ordered.find((m) => !moduleIsComplete(m));
  return incomplete?.id ?? ordered[0].id;
}

export function getNextModuleId(
  currentModuleId: string,
  ordered: { id: string }[],
): string | null {
  const i = ordered.findIndex((m) => m.id === currentModuleId);
  if (i === -1 || i >= ordered.length - 1) return null;
  return ordered[i + 1]?.id ?? null;
}
