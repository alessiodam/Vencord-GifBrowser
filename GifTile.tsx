/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/lazyReact";
import { classes } from "@utils/misc";
import { React } from "@webpack/common";

import { Gif, isVideo } from "./api";
import { TileRect } from "./layout";
import { cl } from "./utils";

function useInView(ref: React.RefObject<HTMLElement | null>, root: HTMLElement | null) {
    const [inView, setInView] = React.useState(false);

    React.useEffect(() => {
        const element = ref.current;
        if (!element || !root) return;

        const observer = new IntersectionObserver(
            ([entry]) => setInView(entry.isIntersecting),
            { root, rootMargin: "400px 0px" }
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [root]);

    return inView;
}

function StarIcon({ filled }: { filled: boolean; }) {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18">
            <path
                d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
                fill={filled ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export interface GifTileProps {
    gif: Gif;
    focused: boolean;
    selectMode: boolean;
    selected: boolean;
    favorite: boolean;
    tags: string[];
    rect: TileRect;
    scrollRoot: HTMLElement | null;
    onActivate(gif: Gif, event: React.MouseEvent): void;
    onContextMenu(gif: Gif, event: React.MouseEvent): void;
    onToggleFavorite(gif: Gif): void;
}

function GifTileComponent({ gif, focused, selectMode, selected, favorite, tags, rect, scrollRoot, onActivate, onContextMenu, onToggleFavorite }: GifTileProps) {
    const ref = React.useRef<HTMLDivElement>(null);
    const inView = useInView(ref, scrollRoot);

    return (
        <div
            ref={ref}
            className={classes(cl("tile"), focused && cl("tile-focused"), selected && cl("tile-selected"))}
            style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
            onClick={e => onActivate(gif, e)}
            onContextMenu={e => onContextMenu(gif, e)}
        >
            {inView && (isVideo(gif.src)
                ? <video className={cl("media")} src={gif.src} autoPlay loop muted playsInline />
                : <img className={cl("media")} src={gif.src} alt="" draggable={false} />
            )}

            <button
                className={classes(cl("star"), favorite && cl("star-active"))}
                aria-label={favorite ? "Remove from Favorites" : "Add to Favorites"}
                onClick={e => {
                    e.stopPropagation();
                    onToggleFavorite(gif);
                }}
            >
                <StarIcon filled={favorite} />
            </button>

            {selectMode && <div className={cl("check")}>{selected ? "✓" : null}</div>}

            {tags.length > 0 && (
                <div className={cl("tile-tags")}>
                    {tags.slice(0, 3).map(tag => <span key={tag} className={cl("tile-tag")}>{tag}</span>)}
                    {tags.length > 3 && <span className={cl("tile-tag")}>+{tags.length - 3}</span>}
                </div>
            )}
        </div>
    );
}

export const GifTile = LazyComponent(() => React.memo(GifTileComponent));
