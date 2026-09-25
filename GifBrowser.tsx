/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { ContextMenuApi, React, showToast, Toasts, UserSettingsProtoStore, useStateFromStores } from "@webpack/common";

import { addFavorite, Category, clearRecent, favoritesToList, getFavoritesMap, Gif, insertGif, searchGifs, searchSuggestions, sendGif, toggleFavorite, trendingCategories, trendingGifs, useRecent } from "./api";
import { GifTile } from "./GifTile";
import { computeMasonry, neighbour } from "./layout";
import { BulkTagMenu, GifActions, GifContextMenu } from "./menus";
import { settings, View } from "./settings";
import { useGifTags } from "./tags";
import { cl } from "./utils";

const VIEWS: Array<{ id: View; label: string; }> = [
    { id: "favorites", label: "Favorites" },
    { id: "recent", label: "Recent" },
    { id: "klipy", label: "Klipy" }
];

const PAGE_SIZE = 50;
const GRID_PADDING = 12;
const GRID_GAP = 8;

const normalize = (text: string) => text.toLowerCase().replace(/[-_ ]/g, "");

const NO_TAGS: string[] = [];

function useKlipy(active: boolean, rawQuery: string) {
    const query = rawQuery.trim();
    const [limit, setLimit] = React.useState(PAGE_SIZE);
    const [gifs, setGifs] = React.useState<Gif[]>([]);
    const [exhausted, setExhausted] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(false);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [suggestions, setSuggestions] = React.useState<string[]>([]);

    React.useEffect(() => setLimit(PAGE_SIZE), [query]);

    React.useEffect(() => {
        if (!active) return;

        let cancelled = false;
        setLoading(true);

        const timer = setTimeout(async () => {
            try {
                const result = query ? await searchGifs(query, limit) : await trendingGifs(limit);
                if (cancelled) return;
                setGifs(result);
                setExhausted(result.length < limit);
                setError(false);
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, query && limit === PAGE_SIZE ? 250 : 0);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [active, query, limit]);

    React.useEffect(() => {
        if (active && !categories.length) trendingCategories().then(setCategories, () => { });
    }, [active]);

    React.useEffect(() => {
        if (!active || !query) {
            setSuggestions([]);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(() => {
            searchSuggestions(query).then(result => {
                if (!cancelled) setSuggestions(result.filter(s => s.toLowerCase() !== query.toLowerCase()));
            }, () => { });
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [active, query]);

    const loadMore = () => {
        if (!loading && !exhausted) setLimit(l => l + PAGE_SIZE);
    };

    return { gifs, loading, error, categories, suggestions, loadMore };
}

function ClearRecentButton() {
    const [armed, setArmed] = React.useState(false);

    React.useEffect(() => {
        if (!armed) return;
        const timer = setTimeout(() => setArmed(false), 3000);
        return () => clearTimeout(timer);
    }, [armed]);

    return (
        <button
            className={classes(cl("button"), armed && cl("button-danger"))}
            onClick={() => {
                if (armed) clearRecent();
                setArmed(!armed);
            }}
        >
            {armed ? "Click again to clear" : "Clear recent"}
        </button>
    );
}

function Kbd({ children }: { children: React.ReactNode; }) {
    return <kbd className={cl("kbd")}>{children}</kbd>;
}

export function GifBrowser({ channelId, onClose }: { channelId: string; onClose(): void; }) {
    const [view, setView] = React.useState<View>(() => settings.store.defaultView as View);
    const [query, setQuery] = React.useState("");
    const [activeTags, setActiveTags] = React.useState<string[]>([]);
    const [untaggedOnly, setUntaggedOnly] = React.useState(false);
    const [focusIndex, setFocusIndex] = React.useState(-1);
    const [selection, setSelection] = React.useState<Map<string, Gif> | null>(null);
    const [scroller, setScroller] = React.useState<HTMLDivElement | null>(null);
    const [gridWidth, setGridWidth] = React.useState(0);
    const gridRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const { tileSize } = settings.use(["tileSize"]);
    const favoritesMap = useStateFromStores([UserSettingsProtoStore], getFavoritesMap);
    const favorites = React.useMemo(() => favoritesToList(favoritesMap), [favoritesMap]);
    const recent = useRecent();
    const tags = useGifTags();
    const klipy = useKlipy(view === "klipy", query);

    const tagsOf = (url: string) => tags?.data.gifs[url] ?? NO_TAGS;

    const gifs = React.useMemo(() => {
        if (view === "klipy") return klipy.gifs;

        let list = view === "favorites" ? favorites : recent;

        if (tags && untaggedOnly) {
            list = list.filter(gif => !tagsOf(gif.url).length);
        } else if (tags && activeTags.length) {
            list = list.filter(gif => {
                const gifTags = tagsOf(gif.url);
                return activeTags.every(tag => gifTags.includes(tag));
            });
        }

        const q = normalize(query);
        if (q) list = list.filter(gif => normalize(gif.url).includes(q) || tagsOf(gif.url).some(tag => normalize(tag).includes(q)));

        return list;
    }, [view, favorites, recent, klipy.gifs, tags?.data, activeTags, untaggedOnly, query]);

    React.useEffect(() => {
        if (!scroller) return;

        const observer = new ResizeObserver(() => setGridWidth(scroller.clientWidth - 2 * GRID_PADDING));
        observer.observe(scroller);
        return () => observer.disconnect();
    }, [scroller]);

    const layout = React.useMemo(() => computeMasonry(gifs, gridWidth, tileSize, GRID_GAP), [gifs, gridWidth, tileSize]);

    const tagCounts = React.useMemo(() => {
        const counts = new Map<string, number>();
        let untagged = 0;
        for (const url in favoritesMap) {
            const gifTags = tags?.data.gifs[url];
            if (!gifTags?.length) untagged++;
            else gifTags.forEach(tag => counts.set(tag, (counts.get(tag) ?? 0) + 1));
        }
        return { counts, untagged };
    }, [favoritesMap, tags?.data]);

    React.useEffect(() => {
        setFocusIndex(-1);
        scroller?.scrollTo(0, 0);
    }, [view, query, activeTags, untaggedOnly]);

    React.useEffect(() => {
        if (focusIndex >= 0) gridRef.current?.children[focusIndex]?.scrollIntoView({ block: "nearest" });
    }, [focusIndex]);

    React.useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus(), 0);
        return () => clearTimeout(timer);
    }, []);

    const focusSearch = () => inputRef.current?.focus();

    const actions: GifActions = {
        send(gif, keepOpen) {
            sendGif(channelId, gif, view === "klipy" ? query : "");
            if (!keepOpen && settings.store.closeOnSend) onClose();
            else showToast("GIF sent", Toasts.Type.SUCCESS);
        },
        insert(gif) {
            insertGif(gif, view === "klipy" ? query : "");
            onClose();
        }
    };

    function toggleSelected(gif: Gif) {
        setSelection(current => {
            const next = new Map(current ?? []);
            if (!next.delete(gif.url)) next.set(gif.url, gif);
            return next;
        });
    }

    function activate(gif: Gif, { shift, ctrl }: { shift: boolean; ctrl: boolean; }) {
        if (selection) toggleSelected(gif);
        else if (shift) actions.insert(gif);
        else actions.send(gif, ctrl);
    }

    const latest = React.useRef({ activate, actions });
    latest.current = { activate, actions };

    const onTileActivate = React.useCallback((gif: Gif, e: React.MouseEvent) => {
        latest.current.activate(gif, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });
    }, []);

    const onTileContextMenu = React.useCallback((gif: Gif, e: React.MouseEvent) => {
        ContextMenuApi.openContextMenu(e, () => <GifContextMenu gif={gif} actions={latest.current.actions} />);
    }, []);

    const onToggleFavorite = React.useCallback((gif: Gif) => toggleFavorite(gif), []);

    function switchView(next: View) {
        setView(next);
        focusSearch();
    }

    function toggleTagFilter(tag: string) {
        if (view === "klipy") setView("favorites");
        setUntaggedOnly(false);
        setActiveTags(current => current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]);
        focusSearch();
    }

    function toggleUntagged() {
        if (view === "klipy") setView("favorites");
        setActiveTags([]);
        setUntaggedOnly(u => !u);
        focusSearch();
    }

    function move(direction: "up" | "down" | "left" | "right") {
        if (!gifs.length) return;
        setFocusIndex(current => current < 0 || current >= gifs.length ? 0 : neighbour(layout, current, direction));
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        const ctrl = e.ctrlKey || e.metaKey;

        switch (e.key) {
            case "ArrowRight":
                e.preventDefault();
                return move("right");
            case "ArrowLeft":
                e.preventDefault();
                return move("left");
            case "ArrowDown":
                e.preventDefault();
                return move("down");
            case "ArrowUp":
                e.preventDefault();
                return move("up");
            case "Enter": {
                e.preventDefault();
                const gif = gifs[Math.max(focusIndex, 0)];
                if (gif) activate(gif, { shift: e.shiftKey, ctrl });
                return;
            }
            case "Tab": {
                e.preventDefault();
                const index = VIEWS.findIndex(v => v.id === view);
                const next = (index + (e.shiftKey ? VIEWS.length - 1 : 1)) % VIEWS.length;
                return switchView(VIEWS[next].id);
            }
            case "s":
            case "S": {
                if (!ctrl) return;
                e.preventDefault();
                const gif = gifs[focusIndex];
                if (gif) toggleFavorite(gif);
                return;
            }
        }
    }

    function onScroll(e: React.UIEvent<HTMLDivElement>) {
        const el = e.currentTarget;
        if (view === "klipy" && el.scrollTop + el.clientHeight > el.scrollHeight - 600) klipy.loadMore();
    }

    const viewCounts: Record<View, number | null> = { favorites: favorites.length, recent: recent.length, klipy: null };

    const chips = view !== "klipy"
        ? []
        : query.trim()
            ? klipy.suggestions.map(s => ({ label: s, value: s }))
            : klipy.categories.map(c => ({ label: c.name, value: c.name }));

    function emptyText() {
        if (view === "klipy") return klipy.error ? "Couldn't load GIFs from Klipy" : klipy.loading ? "Loading..." : "No GIFs found";
        if (query || activeTags.length || untaggedOnly) return "No GIFs match";
        return view === "favorites"
            ? "No favorite GIFs yet. Star GIFs to add them"
            : "GIFs you send from here show up here";
    }

    const selectedGifs = selection ? [...selection.values()] : [];

    return (
        <div className={cl("root")}>
            <nav className={cl("sidebar")}>
                <div className={cl("section")}>
                    {VIEWS.map(v => (
                        <button
                            key={v.id}
                            className={classes(cl("nav-item"), view === v.id && cl("nav-item-active"))}
                            onClick={() => switchView(v.id)}
                        >
                            <span>{v.label}</span>
                            {viewCounts[v.id] != null && <span className={cl("count")}>{viewCounts[v.id]}</span>}
                        </button>
                    ))}
                </div>

                <div className={classes(cl("section"), cl("tags"))}>
                    <div className={cl("section-title")}>Tags</div>
                    {!tags && <div className={cl("hint")}>Enable the GifTags plugin to organize your favorites with tags</div>}
                    {tags && !tags.data.tags.length && <div className={cl("hint")}>Right-click a GIF → Tags to create your first tag</div>}
                    {tags?.data.tags.map(tag => (
                        <button
                            key={tag}
                            className={classes(cl("nav-item"), activeTags.includes(tag) && cl("nav-item-active"))}
                            onClick={() => toggleTagFilter(tag)}
                        >
                            <span className={cl("ellipsis")}>{tag}</span>
                            <span className={cl("count")}>{tagCounts.counts.get(tag) ?? 0}</span>
                        </button>
                    ))}
                    {tags && tags.data.tags.length > 0 && (
                        <button
                            className={classes(cl("nav-item"), cl("nav-item-untagged"), untaggedOnly && cl("nav-item-active"))}
                            onClick={toggleUntagged}
                        >
                            <span>Untagged</span>
                            <span className={cl("count")}>{tagCounts.untagged}</span>
                        </button>
                    )}
                </div>

                <label className={cl("size")}>
                    <span>Size</span>
                    <input
                        type="range"
                        min={100}
                        max={320}
                        step={10}
                        value={tileSize}
                        onChange={e => settings.store.tileSize = Number(e.currentTarget.value)}
                    />
                </label>
            </nav>

            <main className={cl("main")}>
                <header className={cl("header")}>
                    <div className={cl("search")}>
                        <svg className={cl("search-icon")} viewBox="0 0 24 24" width="18" height="18">
                            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input
                            ref={inputRef}
                            className={cl("search-input")}
                            placeholder={view === "klipy" ? "Search Klipy" : `Search ${view === "favorites" ? "favorites" : "recent GIFs"} by link or tag`}
                            value={query}
                            onChange={e => setQuery(e.currentTarget.value)}
                            onKeyDown={onKeyDown}
                        />
                        {query && (
                            <button className={cl("clear")} aria-label="Clear search" onClick={() => { setQuery(""); focusSearch(); }}>
                                ✕
                            </button>
                        )}
                    </div>

                    {selection ? (
                        <div className={cl("bulk")}>
                            <span className={cl("muted")}>{selection.size} selected</span>
                            {tags && (
                                <button
                                    className={cl("button")}
                                    disabled={!selection.size}
                                    onClick={e => ContextMenuApi.openContextMenu(e, () => <BulkTagMenu gifs={selectedGifs} />)}
                                >
                                    Tag...
                                </button>
                            )}
                            <button className={cl("button")} disabled={!selection.size} onClick={() => selectedGifs.forEach(addFavorite)}>
                                Favorite
                            </button>
                            <button className={cl("button")} onClick={() => setSelection(new Map([...selection, ...gifs.map(g => [g.url, g] as const)]))}>
                                Select all
                            </button>
                            <button className={cl("button")} disabled={!selection.size} onClick={() => setSelection(new Map())}>
                                Clear
                            </button>
                            <button className={classes(cl("button"), cl("button-primary"))} onClick={() => { setSelection(null); focusSearch(); }}>
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            {view === "recent" && recent.length > 0 && <ClearRecentButton />}
                            <button className={cl("button")} onClick={() => { setSelection(new Map()); focusSearch(); }}>
                                Select
                            </button>
                        </>
                    )}

                    <button className={cl("close")} aria-label="Close" onClick={onClose}>✕</button>
                </header>

                {chips.length > 0 && (
                    <div className={cl("chips")}>
                        {chips.map(chip => (
                            <button key={chip.value} className={cl("chip")} onClick={() => { setQuery(chip.value); focusSearch(); }}>
                                {chip.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className={cl("scroller")} ref={setScroller} onScroll={onScroll}>
                    {gifs.length ? (
                        <div ref={gridRef} className={cl("grid")} style={{ height: layout.height }}>
                            {gridWidth > 0 && gifs.map((gif, i) => (
                                <GifTile
                                    key={gif.url}
                                    gif={gif}
                                    focused={i === focusIndex}
                                    selectMode={selection != null}
                                    selected={selection?.has(gif.url) ?? false}
                                    favorite={gif.url in favoritesMap}
                                    tags={tagsOf(gif.url)}
                                    rect={layout.rects[i]}
                                    scrollRoot={scroller}
                                    onActivate={onTileActivate}
                                    onContextMenu={onTileContextMenu}
                                    onToggleFavorite={onToggleFavorite}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={cl("empty")}>{emptyText()}</div>
                    )}
                    {view === "klipy" && klipy.loading && gifs.length > 0 && <div className={cl("loading")}>Loading...</div>}
                </div>

                <footer className={cl("footer")}>
                    <span><Kbd>Enter</Kbd> send</span>
                    <span><Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> insert link</span>
                    <span><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> send &amp; keep open</span>
                    <span><Kbd>↑↓←→</Kbd> move</span>
                    <span><Kbd>Tab</Kbd> switch view</span>
                    <span><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> favorite</span>
                    <span>right-click for more</span>
                </footer>
            </main>
        </div>
    );
}
