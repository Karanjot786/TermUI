/** @jsxImportSource @termuijs/jsx */
import { caps, wordWrap } from '@termuijs/core';
import { renderApp, useEffect, useKeymap, useRef, useState } from '@termuijs/jsx';
import { Box, Center, List, ScrollView, Text, useListState, type ListItem } from '@termuijs/widgets';

type FeedEntry = {
  title: string;
  summary: string;
  link: string;
};

const FEED_URL = 'https://hnrss.org/frontpage';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeEntities(value: string): string {
  const entities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x')) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (entity.startsWith('#')) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return entities[entity.toLowerCase()] ?? match;
  });
}

function stripMarkup(value: string): string {
  return decodeEntities(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function readTag(section: string, tagName: string): string {
  const tagPattern = escapeRegExp(tagName);
  const match = section.match(new RegExp(`<${tagPattern}\\b[^>]*>([\\s\\S]*?)</${tagPattern}>`, 'i'));
  return match ? stripMarkup(match[1]) : '';
}

function readAtomLink(section: string): string {
  const linkTags = section.match(/<link\b[^>]*\/?>/gi) ?? [];

  for (const tag of linkTags) {
    const hrefMatch = tag.match(/\bhref\s*=\s*(['"])(.*?)\1/i);
    if (!hrefMatch) continue;

    const relMatch = tag.match(/\brel\s*=\s*(['"])(.*?)\1/i);
    if (!relMatch || relMatch[2].toLowerCase() === 'alternate') {
      return decodeEntities(hrefMatch[2]);
    }
  }

  for (const tag of linkTags) {
    const hrefMatch = tag.match(/\bhref\s*=\s*(['"])(.*?)\1/i);
    if (hrefMatch) {
      return decodeEntities(hrefMatch[2]);
    }
  }

  return '';
}

function parseFeed(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const seenEntries = new Set<string>();

  const rssItems = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (const item of rssItems) {
    const title = readTag(item, 'title') || 'Untitled item';
    const summary = readTag(item, 'description')
      || readTag(item, 'summary')
      || readTag(item, 'content:encoded')
      || '';
    const link = readTag(item, 'link') || readTag(item, 'guid') || '';
    const dedupeKey = `${title}|${link}|${summary}`;
    if (seenEntries.has(dedupeKey)) continue;
    seenEntries.add(dedupeKey);
    entries.push({ title, summary, link });
  }

  const atomEntries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  for (const entry of atomEntries) {
    const title = readTag(entry, 'title') || 'Untitled entry';
    const summary = readTag(entry, 'summary') || readTag(entry, 'content') || '';
    const link = readAtomLink(entry) || readTag(entry, 'id') || '';
    const dedupeKey = `${title}|${link}|${summary}`;
    if (seenEntries.has(dedupeKey)) continue;
    seenEntries.add(dedupeKey);
    entries.push({ title, summary, link });
  }

  return entries;
}

function formatEntry(entry: FeedEntry): string {
  const summary = entry.summary.trim() || 'No summary available.';
  const link = entry.link.trim() || 'No link available.';

  return `Title: ${entry.title}\n\nSummary:\n${summary}\n\nLink: ${link}`;
}

async function fetchFeedXml(url: string): Promise<string> {
  const response = await globalThis.fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}`);
  }

  return response.text();
}

class DetailScrollView extends ScrollView {
  private readonly detailText = new Text('', {}, { wrap: true });
  private content = '';
  private renderedLineCount = 0;

  constructor() {
    super(
      {
        flexGrow: 1,
        border: 'single',
        borderColor: { type: 'named', name: 'brightBlack' },
      },
      { showScrollbar: true },
    );

    this.addChild(this.detailText);
  }

  setEntry(entry: FeedEntry | null): void {
    const content = entry ? formatEntry(entry) : 'No entry selected.';
    if (content === this.content) return;

    this.content = content;
    this.detailText.setContent(content);
    this.scrollTo(0);
    this.updateWrappedHeight();
  }

  override syncLayout(): void {
    super.syncLayout();
    this.updateWrappedHeight();
  }

  private updateWrappedHeight(): void {
    const contentWidth = Math.max(1, this.rect.width - 2);
    const lineCount = wordWrap(this.content, contentWidth).split('\n').length;
    if (lineCount === this.renderedLineCount) return;

    this.renderedLineCount = lineCount;
    this.detailText.setStyle({ height: lineCount });
    this.setContentHeight(lineCount);
  }
}

function LoadingScreen() {
  const center = new Center({ flexGrow: 1 });
  center.addChild(new Text('Loading RSS feed...', { height: 1, bold: true, fg: { type: 'named', name: 'cyan' } }));
  return center;
}

function ErrorScreen({ message }: { message: string }) {
  const center = new Center({ flexGrow: 1 });
  const box = new Box({ flexDirection: 'column', gap: 1 });
  box.addChild(new Text(message, { height: 1, bold: true, fg: { type: 'named', name: 'red' } }));
  box.addChild(new Text('Press r to retry.', { height: 1, fg: { type: 'named', name: 'red' } }));
  center.addChild(box);
  return center;
}

function FeedListPane({ items, state }: { items: FeedEntry[]; state: ReturnType<typeof useListState> }) {
  const listRef = useRef<List | null>(null);
  const mappedItems: ListItem[] = items.map((entry) => ({ label: entry.title, value: entry.link }));

  const list = listRef.current ??= new List(
    { items: mappedItems, state },
    {
      flexGrow: 1,
      border: 'single',
      borderColor: { type: 'named', name: 'brightBlack' },
    },
  );

  list.setItems(mappedItems);
  list.isFocused = true;

  return list;
}

function DetailPane({
  entry,
  scrollRef,
}: {
  entry: FeedEntry | null;
  scrollRef: { current: DetailScrollView | null };
}) {
  const localScrollRef = useRef<DetailScrollView | null>(null);
  const scrollView = localScrollRef.current ??= new DetailScrollView();

  scrollRef.current = scrollView;

  useEffect(() => {
    scrollView.setEntry(entry);
  }, [entry, scrollView]);

  return scrollView;
}

function FeedReaderApp() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [renderTick, setRenderTick] = useState(0);
  const [listState] = useState(() => useListState({ items: [] }));
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const detailScrollRef = useRef<DetailScrollView | null>(null);

  const feedUrl = refreshToken === 0 ? FEED_URL : `${FEED_URL}?_=${refreshToken}`;

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    fetchFeedXml(feedUrl)
      .then((xml) => {
        if (!active) return;
        setData(xml);
        setLoading(false);
      })
      .catch((rawError: unknown) => {
        if (!active) return;
        setError(rawError instanceof Error ? rawError : new Error(String(rawError)));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [feedUrl]);

  const entries = data ? parseFeed(data) : [];
  const listItems: ListItem[] = entries.map((entry) => ({ label: entry.title, value: entry.link }));
  listState.setItems(listItems);

  const selectedEntry = entries[listState.selectedIndex] ?? null;
  const title = caps.unicode ? '📰 Hacker News Front Page' : 'Hacker News Front Page';

  useKeymap([
    { key: 'q', action: () => globalThis.process.exit(0) },
    {
      key: 'up',
      action: () => {
        listState.selectPrev();
        setRenderTick((value: number) => value + 1);
      },
    },
    {
      key: 'down',
      action: () => {
        listState.selectNext();
        setRenderTick((value: number) => value + 1);
      },
    },
    {
      key: 'r',
      action: () => {
        setRefreshToken((value: number) => value + 1);
        setRenderTick((value: number) => value + 1);
      },
    },
    {
      key: 'pageup',
      action: () => {
        detailScrollRef.current?.scrollBy(-Math.max(1, detailScrollRef.current.rect.height - 1));
        setRenderTick((value: number) => value + 1);
      },
    },
    {
      key: 'pagedown',
      action: () => {
        detailScrollRef.current?.scrollBy(Math.max(1, detailScrollRef.current.rect.height - 1));
        setRenderTick((value: number) => value + 1);
      },
    },
  ]);

  void renderTick;

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error.message} />;
  }

  return (
    <box flexDirection="column" flexGrow={1} padding={1} gap={1}>
      <box flexDirection="row" height={1}>
        <text bold color="cyan">{title}</text>
        <spacer />
        <text dim>q quit | r refresh | up/down navigate | pgup/pgdn details</text>
      </box>

      <box flexDirection="row" flexGrow={1} gap={1}>
        <FeedListPane items={entries} state={listState} />
        <DetailPane entry={selectedEntry} scrollRef={detailScrollRef} />
      </box>
    </box>
  );
}

renderApp(FeedReaderApp, { title: 'RSS Reader' }).catch(() => {
  globalThis.process.exit(1);
});
