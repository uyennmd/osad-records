const initializedRoots = new WeakSet<HTMLElement>();
const rootRenderers = new WeakMap<HTMLElement, () => void>();
let historyListenerInitialized = false;

type ListState = {
  q: string;
  type: string;
  year: string;
  sort: string;
  view: string;
  page: number;
};

function initializeRoot(root: HTMLElement): void {
  if (initializedRoots.has(root)) return;
  initializedRoots.add(root);

  const searchInput = root.querySelector<HTMLInputElement>('[data-search-input]');
  const yearSelect = root.querySelector<HTMLSelectElement>('[data-year-filter]');
  const sortSelect = root.querySelector<HTMLSelectElement>('[data-sort-control]');
  const itemsContainer = root.querySelector<HTMLElement>('[data-list-items]');
  const status = root.querySelector<HTMLElement>('[data-list-status]');
  const clearFiltersButton = root.querySelector<HTMLButtonElement>('.clear-filters-link');
  const pagination = root.querySelector<HTMLElement>('[data-pagination]');
  const emptyState = root.querySelector<HTMLElement>('[data-list-empty]');
  const items = itemsContainer
    ? Array.from(itemsContainer.querySelectorAll<HTMLElement>('[data-list-item]'))
    : Array.from(root.querySelectorAll<HTMLElement>('[data-list-item]'));
  const groupedItems = Boolean(itemsContainer?.querySelector('[data-year-items]'));
  const groupContainers = new Map(
    Array.from(itemsContainer?.querySelectorAll<HTMLElement>('[data-year-items]') ?? [])
      .map(container => [container.dataset.yearItems ?? '', container]),
  );
  const defaultSort = root.dataset.defaultSort ?? 'newest';
  const defaultView = root.dataset.defaultView ?? 'grid';
  const getPageSize = (view: string) => {
    const configuredSizes = root.dataset.pageSizes?.split(',') ?? [];
    const matchedSize = configuredSizes.find(size => size.startsWith(`${view}:`))?.split(':')[1];
    return Math.max(1, Number(matchedSize ?? root.dataset.pageSize) || 12);
  };
  const defaultState: ListState = {
    q: '',
    type: '',
    year: '',
    sort: defaultSort,
    view: defaultView,
    page: 1,
  };

  const readState = (): ListState => {
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get('q') ?? defaultState.q,
      type: params.get('type') ?? defaultState.type,
      year: params.get('year') ?? defaultState.year,
      sort: params.get('sort') ?? defaultState.sort,
      view: params.get('view') ?? defaultState.view,
      page: Math.max(1, Number(params.get('page')) || 1),
    };
  };

  const writeState = (state: ListState): void => {
    const url = new URL(window.location.href);
    url.searchParams.set('q', state.q);
    url.searchParams.set('type', state.type);
    url.searchParams.set('year', state.year);
    url.searchParams.set('sort', state.sort);
    url.searchParams.set('view', state.view);
    url.searchParams.set('page', String(state.page));
    window.history.replaceState({}, '', url);
  };

  const render = (state: ListState, updateUrl = false): void => {
    if (searchInput) searchInput.value = state.q;
    if (yearSelect) yearSelect.value = state.year;
    if (sortSelect) sortSelect.value = state.sort;

    root.querySelectorAll<HTMLButtonElement>('[data-type-filter]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.typeFilter === state.type));
    });
    root.querySelectorAll<HTMLButtonElement>('[data-view-control]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.viewControl === state.view));
    });
    root.dataset.activeView = state.view;
    itemsContainer?.classList.toggle('grid-view', state.view === 'grid');
    itemsContainer?.classList.toggle('list-view', state.view === 'list');

    const normalizedQuery = state.q.trim().toLocaleLowerCase('vi');
    const filtered = items.filter(item => {
      const text = (item.dataset.search ?? item.textContent ?? '').toLocaleLowerCase('vi');
      return (
        (!normalizedQuery || text.includes(normalizedQuery)) &&
        (!state.type || item.dataset.type === state.type) &&
        (!state.year || item.dataset.year === state.year)
      );
    });
    filtered.sort((first, second) => {
      if (state.sort === 'oldest') return (first.dataset.date ?? '').localeCompare(second.dataset.date ?? '');
      if (state.sort === 'title') return (first.dataset.title ?? '').localeCompare(second.dataset.title ?? '', 'vi');
      return (second.dataset.date ?? '').localeCompare(first.dataset.date ?? '');
    });
    if (itemsContainer) {
      if (groupedItems) {
        filtered.forEach(item => groupContainers.get(item.dataset.year ?? '')?.append(item));
        const orderedGroups = [...new Set(filtered.map(item => item.dataset.year ?? ''))];
        orderedGroups.forEach(year => {
          const group = groupContainers.get(year)?.closest<HTMLElement>('[data-year-group]');
          if (group) itemsContainer.append(group);
        });
      } else {
        filtered.forEach(item => itemsContainer.append(item));
      }
    }

    const pageSize = getPageSize(state.view);
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    state.page = Math.min(state.page, pageCount);
    const start = filtered.length ? (state.page - 1) * pageSize : 0;
    const visibleItems = new Set(filtered.slice(start, start + pageSize));

    items.forEach(item => {
      item.hidden = !visibleItems.has(item);
    });
    root.querySelectorAll<HTMLElement>('[data-list-year-heading]').forEach(heading => {
      const headingYear = heading.dataset.listYearHeading;
      heading.hidden = !Array.from(visibleItems).some(item => item.dataset.year === headingYear);
    });
    if (emptyState) emptyState.hidden = filtered.length > 0;
    if (status) {
      const from = filtered.length ? start + 1 : 0;
      const to = filtered.length ? Math.min(start + pageSize, filtered.length) : 0;
      status.textContent = `Hiển thị ${from} đến ${to} / ${root.dataset.totalItems ?? items.length}`;
    }
    if (clearFiltersButton) {
      clearFiltersButton.hidden = !(state.q.trim() || state.type || state.year);
    }

    if (pagination) {
      pagination.replaceChildren();
      const addPageButton = (label: string, page: number, ariaLabel: string, current = false) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.page = String(page);
        button.textContent = label;
        button.setAttribute('aria-label', ariaLabel);
        if (current) {
          button.className = 'current';
          button.setAttribute('aria-current', 'page');
        }
        pagination.append(button);
      };
      addPageButton('‹', Math.max(1, state.page - 1), 'Trang trước');
      const pages = new Set([1, pageCount, state.page - 1, state.page, state.page + 1]);
      let previous = 0;
      for (const page of [...pages].filter(value => value >= 1 && value <= pageCount).sort((a, b) => a - b)) {
        if (previous && page - previous > 1) {
          const dots = document.createElement('span');
          dots.textContent = '…';
          dots.setAttribute('aria-hidden', 'true');
          pagination.append(dots);
        }
        addPageButton(String(page), page, `Trang ${page}`, page === state.page);
        previous = page;
      }
      addPageButton('›', Math.min(pageCount, state.page + 1), 'Trang sau');
    }

    if (updateUrl) writeState(state);
  };
  rootRenderers.set(root, () => render(readState()));

  const changeState = (updates: Partial<ListState>): void => {
    const state = { ...readState(), ...updates };
    if ('q' in updates || 'type' in updates || 'year' in updates || 'sort' in updates || 'view' in updates) {
      state.page = 1;
    }
    render(state, true);
  };

  searchInput?.addEventListener('input', () => changeState({ q: searchInput.value }));
  yearSelect?.addEventListener('change', () => changeState({ year: yearSelect.value }));
  sortSelect?.addEventListener('change', () => changeState({ sort: sortSelect.value }));
  root.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const typeButton = target.closest<HTMLButtonElement>('[data-type-filter]');
    if (typeButton) {
      changeState({ type: typeButton.dataset.typeFilter ?? '' });
      return;
    }
    const viewButton = target.closest<HTMLButtonElement>('[data-view-control]');
    if (viewButton) {
      changeState({ view: viewButton.dataset.viewControl ?? defaultView });
      return;
    }
    const pageButton = target.closest<HTMLButtonElement>('[data-page]');
    if (pageButton) {
      const state = { ...readState(), page: Number(pageButton.dataset.page) };
      render(state, true);
      root.querySelector<HTMLElement>('[data-list-scroll-target]')?.scrollIntoView({ block: 'start' });
    }
    if (target.closest('[data-clear-filters]')) {
      render(defaultState, true);
    }
  });
  render(readState());
}

export function initializeListControls(): void {
  if (!historyListenerInitialized) {
    window.addEventListener('popstate', () => {
      document.querySelectorAll<HTMLElement>('[data-list-root]').forEach(root => rootRenderers.get(root)?.());
    });
    historyListenerInitialized = true;
  }
  document.querySelectorAll<HTMLElement>('[data-list-root]').forEach(initializeRoot);
}
