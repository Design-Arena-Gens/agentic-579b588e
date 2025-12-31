'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BarChart3, Bot, BrainCircuit, PlayCircle, RefreshCcw, Search, Sparkles, Workflow } from 'lucide-react';
import clsx from 'clsx';

type YoutubeChannelStats = {
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
};

type YoutubeVideo = {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
  description: string;
};

type YoutubeComment = {
  id: string;
  author: string;
  text: string;
  likeCount: number;
  publishedAt: string;
};

type WorkflowStepType = 'channelStats' | 'searchVideos' | 'fetchComments';

type WorkflowStep = {
  id: string;
  type: WorkflowStepType;
  config: Record<string, string>;
};

type WorkflowSchedule = 'manual' | 'daily' | 'hourly';

type AutomationWorkflow = {
  id: string;
  name: string;
  schedule: WorkflowSchedule;
  steps: WorkflowStep[];
};

const STORAGE_KEYS = {
  apiKey: 'youtube-automation:api-key',
  workflows: 'youtube-automation:workflows',
  channelId: 'youtube-automation:channel-id'
} as const;

const scheduleLabel: Record<WorkflowSchedule, string> = {
  manual: 'Run on demand',
  daily: 'Run daily',
  hourly: 'Run hourly'
};

function getLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage`, error);
    return fallback;
  }
}

function setLocalStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist ${key} in localStorage`, error);
  }
}

function formatNumber(value: number) {
  return Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function HomePage() {
  const [apiKey, setApiKey] = useState('');
  const [channelId, setChannelId] = useState('');
  const [channelStats, setChannelStats] = useState<YoutubeChannelStats | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [isChannelLoading, setIsChannelLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YoutubeVideo[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [commentsVideoId, setCommentsVideoId] = useState('');
  const [comments, setComments] = useState<YoutubeComment[]>([]);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);

  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);

  useEffect(() => {
    const storedApiKey = getLocalStorage(STORAGE_KEYS.apiKey, '');
    const storedChannelId = getLocalStorage(STORAGE_KEYS.channelId, '');
    const storedWorkflows = getLocalStorage<AutomationWorkflow[]>(STORAGE_KEYS.workflows, []);
    setApiKey(storedApiKey);
    setChannelId(storedChannelId);
    setWorkflows(storedWorkflows);
    if (storedWorkflows.length > 0) {
      setSelectedWorkflowId(storedWorkflows[0].id);
    }
  }, []);

  useEffect(() => {
    setLocalStorage(STORAGE_KEYS.apiKey, apiKey);
  }, [apiKey]);

  useEffect(() => {
    setLocalStorage(STORAGE_KEYS.channelId, channelId);
  }, [channelId]);

  useEffect(() => {
    setLocalStorage(STORAGE_KEYS.workflows, workflows);
  }, [workflows]);

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null,
    [workflows, selectedWorkflowId]
  );

  async function fetchChannel() {
    setChannelError(null);
    setIsChannelLoading(true);
    try {
      const response = await fetch('/api/youtube/channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          channelId
        })
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error ?? 'Unable to fetch channel data.');
      }

      const { data } = (await response.json()) as { data: YoutubeChannelStats };
      setChannelStats(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch channel data.';
      setChannelError(message);
      setChannelStats(null);
    } finally {
      setIsChannelLoading(false);
    }
  }

  async function fetchSearch() {
    setSearchError(null);
    setIsSearchLoading(true);
    try {
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          query: searchQuery
        })
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error ?? 'Unable to run search.');
      }

      const { data } = (await response.json()) as { data: YoutubeVideo[] };
      setSearchResults(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch videos.';
      setSearchError(message);
      setSearchResults([]);
    } finally {
      setIsSearchLoading(false);
    }
  }

  async function fetchComments() {
    setCommentsError(null);
    setIsCommentsLoading(true);
    try {
      const response = await fetch('/api/youtube/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          videoId: commentsVideoId
        })
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error ?? 'Unable to fetch comments.');
      }

      const { data } = (await response.json()) as { data: YoutubeComment[] };
      setComments(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch comments.';
      setCommentsError(message);
      setComments([]);
    } finally {
      setIsCommentsLoading(false);
    }
  }

  function addWorkflow(name: string, schedule: WorkflowSchedule) {
    const newWorkflow: AutomationWorkflow = {
      id: crypto.randomUUID(),
      name,
      schedule,
      steps: []
    };
    setWorkflows((prev) => [newWorkflow, ...prev]);
    setSelectedWorkflowId(newWorkflow.id);
  }

  function updateWorkflow(updated: AutomationWorkflow) {
    setWorkflows((prev) => prev.map((workflow) => (workflow.id === updated.id ? updated : workflow)));
  }

  function removeWorkflow(workflowId: string) {
    setWorkflows((prev) => prev.filter((workflow) => workflow.id !== workflowId));
    if (selectedWorkflowId === workflowId) {
      setSelectedWorkflowId(workflows.filter((workflow) => workflow.id !== workflowId)[0]?.id ?? null);
    }
  }

  async function runWorkflow(workflow: AutomationWorkflow) {
    if (!workflow) return;

    if (!apiKey) {
      setRunLog((prev) => ['⚠️ Add an API key before running workflows.', ...prev]);
      return;
    }

    setIsRunningWorkflow(true);
    setRunLog((prev) => [`▶️ Running workflow "${workflow.name}" (${scheduleLabel[workflow.schedule]})`, ...prev]);

    for (const step of workflow.steps) {
      try {
        if (step.type === 'channelStats') {
          const response = await fetch('/api/youtube/channel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              apiKey,
              channelId: step.config.channelId ?? channelId
            })
          });

          if (!response.ok) {
            const { error } = await response.json();
            throw new Error(error ?? 'Channel stats step failed.');
          }

          const { data } = (await response.json()) as { data: YoutubeChannelStats };
          setRunLog((prev) => [`✅ Channel: ${data.title} • ${formatNumber(data.subscriberCount)} subs`, ...prev]);
        }

        if (step.type === 'searchVideos') {
          const response = await fetch('/api/youtube/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              apiKey,
              query: step.config.query ?? searchQuery
            })
          });

          if (!response.ok) {
            const { error } = await response.json();
            throw new Error(error ?? 'Search step failed.');
          }

          const { data } = (await response.json()) as { data: YoutubeVideo[] };
          const topThree = data.slice(0, 3).map((video) => video.title).join(' • ');
          setRunLog((prev) => [`🔍 Search "${step.config.query}": ${topThree}`, ...prev]);
        }

        if (step.type === 'fetchComments') {
          const response = await fetch('/api/youtube/comments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              apiKey,
              videoId: step.config.videoId ?? commentsVideoId
            })
          });

          if (!response.ok) {
            const { error } = await response.json();
            throw new Error(error ?? 'Comments step failed.');
          }

          const { data } = (await response.json()) as { data: YoutubeComment[] };
          setRunLog((prev) => [`💬 Pulled ${data.length} comments for video ${step.config.videoId}`, ...prev]);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown workflow error.';
        setRunLog((prev) => [`❌ ${workflow.name}: ${message}`, ...prev]);
        break;
      }
    }

    setIsRunningWorkflow(false);
  }

  const [workflowDraftName, setWorkflowDraftName] = useState('');
  const [workflowDraftSchedule, setWorkflowDraftSchedule] = useState<WorkflowSchedule>('manual');

  const [stepDraftType, setStepDraftType] = useState<WorkflowStepType>('channelStats');
  const [stepDraftConfig, setStepDraftConfig] = useState<Record<string, string>>({
    channelId: '',
    query: '',
    videoId: ''
  });

  useEffect(() => {
    setStepDraftConfig((prev) => {
      if (stepDraftType === 'channelStats') {
        return { ...prev, channelId: prev.channelId || channelId };
      }
      if (stepDraftType === 'searchVideos') {
        return { ...prev, query: prev.query || searchQuery || 'youtube automation ideas' };
      }
      if (stepDraftType === 'fetchComments') {
        return { ...prev, videoId: prev.videoId || commentsVideoId };
      }
      return prev;
    });
  }, [stepDraftType, channelId, searchQuery, commentsVideoId]);

  function resetStepDraft() {
    setStepDraftType('channelStats');
    setStepDraftConfig({
      channelId,
      query: searchQuery,
      videoId: commentsVideoId
    });
  }

  function addStepToWorkflow() {
    if (!selectedWorkflow) return;
    const requiredField =
      stepDraftType === 'channelStats'
        ? stepDraftConfig.channelId || channelId
        : stepDraftType === 'searchVideos'
        ? stepDraftConfig.query
        : stepDraftConfig.videoId;

    if (!requiredField) {
      setRunLog((prev) => ['⚠️ Fill in the required fields for the new step.', ...prev]);
      return;
    }

    const step: WorkflowStep = {
      id: crypto.randomUUID(),
      type: stepDraftType,
      config:
        stepDraftType === 'channelStats'
          ? { channelId: stepDraftConfig.channelId || channelId }
          : stepDraftType === 'searchVideos'
          ? { query: stepDraftConfig.query }
          : { videoId: stepDraftConfig.videoId }
    };

    updateWorkflow({
      ...selectedWorkflow,
      steps: [...selectedWorkflow.steps, step]
    });
    resetStepDraft();
  }

  function removeStep(stepId: string) {
    if (!selectedWorkflow) return;
    updateWorkflow({
      ...selectedWorkflow,
      steps: selectedWorkflow.steps.filter((step) => step.id !== stepId)
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#141414] to-[#050505] pb-16">
      <header className="relative isolate overflow-hidden border-b border-white/5 bg-black/80">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,0,51,0.3),_transparent_65%)]" />
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 md:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="glass-panel flex size-12 items-center justify-center border-white/10 bg-primary/10 text-primary">
              <Bot className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">YouTube Automation Studio</h1>
              <p className="muted mt-1 max-w-2xl">
                Orchestrate analytics, research, and engagement workflows for your YouTube channel with a single control panel.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-panel flex items-center gap-3 border-white/10 p-4">
              <BadgeCheck className="size-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-white/90">Automated Quality Checks</p>
                <p className="muted">Pipeline validation on every run.</p>
              </div>
            </div>
            <div className="glass-panel flex items-center gap-3 border-white/10 p-4">
              <BrainCircuit className="size-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-white/90">Workflow Intelligence</p>
                <p className="muted">Prebuilt plays for research and engagement.</p>
              </div>
            </div>
            <div className="glass-panel flex items-center gap-3 border-white/10 p-4">
              <Sparkles className="size-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-white/90">Ready for Vercel Deploy</p>
                <p className="muted">Optimized for edge-friendly automation.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-12 grid max-w-6xl gap-8 px-6 md:px-8 lg:px-12">
        <section className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
          <div className="grid-card">
            <div className="flex items-center justify-between">
              <h2 className="section-title flex items-center gap-2">
                <Bot className="size-5 text-primary" />
                API Control Plane
              </h2>
              <button
                onClick={() => {
                  setApiKey('');
                  setChannelId('');
                  setChannelStats(null);
                  setRunLog((prev) => ['🧹 Cleared API key and default channel.', ...prev]);
                }}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
              >
                Reset
              </button>
            </div>
            <p className="muted mt-2">
              Use a YouTube Data API key with Channel scope to unlock analytics, search, and comment automation tasks. Keys are stored locally
              in your browser only.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-white/60">YouTube Data API Key</label>
                <input
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value.trim())}
                  type="password"
                  placeholder="AIza..."
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-white/60">Default Channel ID</label>
                <input
                  value={channelId}
                  onChange={(event) => setChannelId(event.target.value.trim())}
                  placeholder="UCxxxxxxxxxxxx"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>
          <div className="grid-card">
            <h2 className="section-title mb-2 flex items-center gap-2">
              <Workflow className="size-5 text-primary" />
              Launch Playbook
            </h2>
            <p className="muted">
              Create workflows to orchestrate multi-step automation jobs. Combine analytics, research, and comment harvesting in a single run.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <input
                value={workflowDraftName}
                onChange={(event) => setWorkflowDraftName(event.target.value)}
                placeholder="Automation name"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
              />
              <select
                value={workflowDraftSchedule}
                onChange={(event) => setWorkflowDraftSchedule(event.target.value as WorkflowSchedule)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
              >
                <option value="manual">Manual</option>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
              <button
                onClick={() => {
                  if (!workflowDraftName) {
                    setRunLog((prev) => ['⚠️ Name your workflow before saving.', ...prev]);
                    return;
                  }
                  addWorkflow(workflowDraftName, workflowDraftSchedule);
                  setWorkflowDraftName('');
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:shadow-primary/40"
              >
                <Sparkles className="size-4" />
                Create workflow
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.8fr_1.2fr]">
          <div className="grid-card">
            <div className="flex items-center justify-between">
              <h2 className="section-title flex items-center gap-2">
                <BarChart3 className="size-5 text-primary" />
                Channel Intelligence
              </h2>
              <button
                onClick={fetchChannel}
                disabled={isChannelLoading || !apiKey || !channelId}
                className={clsx(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                  isChannelLoading || !apiKey || !channelId
                    ? 'cursor-not-allowed bg-white/10 text-white/50'
                    : 'bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/40'
                )}
              >
                <RefreshCcw className={clsx('size-4', isChannelLoading && 'animate-spin')} />
                Pull channel stats
              </button>
            </div>
            <p className="muted mt-2">
              Fetch live subscriber, views, and video metrics for your primary channel. Use these metrics to power automations downstream.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-white/60">Channel ID</label>
                <input
                  value={channelId}
                  onChange={(event) => setChannelId(event.target.value.trim())}
                  placeholder="UCxxxxxxxxxxxx"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-white/60">Status</label>
                <div className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white/70">
                  {isChannelLoading ? 'Fetching live metrics…' : channelStats ? 'Ready' : 'Waiting for a fetch'}
                </div>
              </div>
            </div>

            {channelError && (
              <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{channelError}</div>
            )}

            {channelStats && (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-gradient-to-br from-primary/10 to-transparent p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Subscribers</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatNumber(channelStats.subscriberCount)}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-gradient-to-br from-primary/10 to-transparent p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Total Views</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatNumber(channelStats.viewCount)}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-gradient-to-br from-primary/10 to-transparent p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Uploads</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatNumber(channelStats.videoCount)}</p>
                </div>
              </div>
            )}

            {channelStats && (
              <div className="mt-6 flex gap-4">
                <img
                  src={channelStats.thumbnail}
                  alt={channelStats.title}
                  className="h-24 w-24 rounded-xl border border-white/10 object-cover"
                />
                <div>
                  <h3 className="text-lg font-semibold text-white/90">{channelStats.title}</h3>
                  <p className="muted mt-2 max-w-xl text-sm">{channelStats.description}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid-card">
            <h2 className="section-title flex items-center gap-2">
              <PlayCircle className="size-5 text-primary" />
              Search Automation
            </h2>
            <p className="muted mt-2">Run programmatic searches to surface trend candidates and competitor uploads.</p>

            <div className="mt-5 space-y-3">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="e.g. youtube shorts automation"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={fetchSearch}
                disabled={isSearchLoading || !apiKey || !searchQuery}
                className={clsx(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition',
                  isSearchLoading || !apiKey || !searchQuery
                    ? 'cursor-not-allowed bg-white/10 text-white/50'
                    : 'bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/40'
                )}
              >
                <Search className={clsx('size-4', isSearchLoading && 'animate-spin')} />
                Run search
              </button>
            </div>

            {searchError && (
              <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{searchError}</div>
            )}

            <div className="mt-6 space-y-4">
              {searchResults.map((video) => (
                <article key={video.id} className="flex gap-4 rounded-xl border border-white/5 bg-white/5 p-4">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="h-20 w-36 shrink-0 rounded-lg border border-white/10 object-cover"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-white/90">{video.title}</h3>
                    <p className="muted mt-1 text-xs">{video.channelTitle}</p>
                    <p className="muted mt-2 text-xs line-clamp-2">{video.description}</p>
                    <p className="mt-2 text-xs text-white/50">Published {formatDate(video.publishedAt)}</p>
                  </div>
                </article>
              ))}
              {searchResults.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-white/50">
                  Search results will appear here.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.6fr_1.4fr]">
          <div className="grid-card">
            <h2 className="section-title flex items-center gap-2">
              <Workflow className="size-5 text-primary" />
              Workflow Builder
            </h2>
            <p className="muted mt-2">Stack automation steps then launch them in sequence or connect to external schedulers via webhook.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-white/60">Workflows</p>
                <div className="flex flex-col gap-3">
                  {workflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      onClick={() => setSelectedWorkflowId(workflow.id)}
                      className={clsx(
                        'flex flex-col rounded-xl border px-4 py-3 text-left text-sm transition',
                        workflow.id === selectedWorkflowId
                          ? 'border-primary/60 bg-primary/15 text-white shadow-lg shadow-primary/30'
                          : 'border-white/10 bg-black/20 text-white/70 hover:border-white/30 hover:text-white'
                      )}
                    >
                      <span className="font-semibold">{workflow.name}</span>
                      <span className="text-xs text-white/50">{workflow.steps.length} steps • {scheduleLabel[workflow.schedule]}</span>
                    </button>
                  ))}
                  {workflows.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-white/50">
                      Create your first workflow to begin.
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {selectedWorkflow ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white/80">{selectedWorkflow.name}</p>
                        <p className="text-xs text-white/60">{scheduleLabel[selectedWorkflow.schedule]}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => runWorkflow(selectedWorkflow)}
                          disabled={isRunningWorkflow}
                          className={clsx(
                            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                            isRunningWorkflow
                              ? 'cursor-not-allowed bg-white/10 text-white/50'
                              : 'bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/40'
                          )}
                        >
                          <PlayCircle className="size-4" />
                          {isRunningWorkflow ? 'Running…' : 'Run workflow'}
                        </button>
                        <button
                          onClick={() => removeWorkflow(selectedWorkflow.id)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-red-500/40 hover:text-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-white/60">Add Step</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <select
                          value={stepDraftType}
                          onChange={(event) => setStepDraftType(event.target.value as WorkflowStepType)}
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="channelStats">Pull channel metrics</option>
                          <option value="searchVideos">Search for videos</option>
                          <option value="fetchComments">Harvest comments</option>
                        </select>

                        {stepDraftType === 'channelStats' && (
                          <input
                            value={stepDraftConfig.channelId ?? ''}
                            onChange={(event) => setStepDraftConfig((prev) => ({ ...prev, channelId: event.target.value }))}
                            placeholder="Channel ID override (optional)"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                          />
                        )}

                        {stepDraftType === 'searchVideos' && (
                          <input
                            value={stepDraftConfig.query ?? ''}
                            onChange={(event) => setStepDraftConfig((prev) => ({ ...prev, query: event.target.value }))}
                            placeholder="Search query"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                          />
                        )}

                        {stepDraftType === 'fetchComments' && (
                          <input
                            value={stepDraftConfig.videoId ?? ''}
                            onChange={(event) => setStepDraftConfig((prev) => ({ ...prev, videoId: event.target.value }))}
                            placeholder="Target video ID"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                          />
                        )}
                      </div>
                      <button
                        onClick={addStepToWorkflow}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary/60 hover:bg-primary/15"
                      >
                        <Sparkles className="size-4" />
                        Append step
                      </button>
                    </div>

                    <div className="space-y-3">
                      {selectedWorkflow.steps.map((step, index) => (
                        <div key={step.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                {step.type === 'channelStats' && <BarChart3 className="size-4" />}
                                {step.type === 'searchVideos' && <Search className="size-4" />}
                                {step.type === 'fetchComments' && <Bot className="size-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white/90">
                                  Step {index + 1}: {step.type === 'channelStats' ? 'Pull channel metrics' : step.type === 'searchVideos' ? 'Search videos' : 'Harvest comments'}
                                </p>
                                <p className="text-xs text-white/60">
                                  {step.type === 'channelStats' && `Channel ID: ${step.config.channelId ?? channelId}`}
                                  {step.type === 'searchVideos' && `Query: ${step.config.query}`}
                                  {step.type === 'fetchComments' && `Video ID: ${step.config.videoId}`}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeStep(step.id)}
                              className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:border-red-500/40 hover:text-red-200"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      {selectedWorkflow.steps.length === 0 && (
                        <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-white/50">
                          No steps configured yet.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-white/50">
                    Select a workflow to configure steps.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="grid-card">
              <h2 className="section-title flex items-center gap-2">
                <Bot className="size-5 text-primary" />
                Comment Operations
              </h2>
              <p className="muted mt-2">
                Pull top-level comments for fast sentiment review, lead capture, or post-production scripting material.
              </p>

              <div className="mt-5 space-y-3">
                <input
                  value={commentsVideoId}
                  onChange={(event) => setCommentsVideoId(event.target.value)}
                  placeholder="YouTube video ID"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={fetchComments}
                  disabled={isCommentsLoading || !apiKey || !commentsVideoId}
                  className={clsx(
                    'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition',
                    isCommentsLoading || !apiKey || !commentsVideoId
                      ? 'cursor-not-allowed bg-white/10 text-white/50'
                      : 'bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/40'
                  )}
                >
                  <Bot className={clsx('size-4', isCommentsLoading && 'animate-spin')} />
                  Harvest comments
                </button>
              </div>

              {commentsError && (
                <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{commentsError}</div>
              )}

              <div className="mt-5 max-h-72 space-y-3 overflow-y-auto pr-1">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-xl border border-white/5 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white/80">{comment.author}</p>
                      <span className="text-xs text-white/50">{formatDate(comment.publishedAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/80">{comment.text}</p>
                    <p className="mt-2 text-xs text-white/50">👍 {comment.likeCount}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-white/50">
                    Comments will populate here after a fetch.
                  </div>
                )}
              </div>
            </div>

            <div className="grid-card">
              <h2 className="section-title flex items-center gap-2">
                <BrainCircuit className="size-5 text-primary" />
                Execution Log
              </h2>
              <p className="muted mt-2">
                Every workflow run and automation action is recorded here. Connect this feed to a webhook or Slack bot for Ops visibility.
              </p>
              <div className="mt-4 space-y-2 text-xs text-white/70">
                {runLog.map((line, index) => (
                  <p key={`${line}-${index}`} className="rounded-lg border border-white/5 bg-black/25 px-3 py-2">
                    {line}
                  </p>
                ))}
                {runLog.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-white/50">
                    Workflow output will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
