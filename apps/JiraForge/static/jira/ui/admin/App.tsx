import React from "react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setGlobalTheme } from "@atlaskit/tokens";
import { toggleTheme } from "./features/themeSlice";
import {
  fetchProviders,
  refreshAuthStatus,
  fetchWorkspaces,
  fetchRepositories,
  disconnectGit,
  setProvider,
  setWorkspace,
  setRepoUrl,
  setConnecting,
  setError as setGitError,
} from "./features/gitSlice";
import {
  loadContext,
  solveTaskThunk,
  setTaskInput,
} from "./features/taskSlice";
import { fetchConfig, updateConfig } from "./features/configSlice";
import { invoke, router } from "@forge/bridge";

import Button from "@atlaskit/button";
import LoadingButton from "@atlaskit/button/loading-button";
import Heading from "@atlaskit/heading";
import Lozenge from "@atlaskit/lozenge";
import SectionMessage from "@atlaskit/section-message";
import Spinner from "@atlaskit/spinner";
import Select from "@atlaskit/select";
import Textfield from "@atlaskit/textfield";
import TextArea from "@atlaskit/textarea";
import Toggle from "@atlaskit/toggle";
import { RootState, AppDispatch } from "./store";

export default function App() {
  const dispatch = useDispatch<AppDispatch>();

  const themeMode = useSelector(
    (state: RootState) => (state as any).theme.mode,
  );

  const {
    auth,
    provider,
    providers,
    workspace,
    workspaces,
    workspacesLoading,
    repoUrl,
    repos,
    reposLoading,
    connecting,
    error: gitError,
    successMessage: gitSuccess,
  } = useSelector((state: RootState) => state.git);

  const {
    taskInput,
    running,
    result,
    error: taskError,
    warning,
    successMessage: taskSuccess,
  } = useSelector((state: RootState) => state.task);

  const {
    incrementalPrsOn,
    loading: configLoading,
    error: configError,
    successMessage: configSuccess,
  } = useSelector((state: RootState) => state.config);

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    setGlobalTheme({
      colorMode: themeMode as any,
      dark: "dark",
      light: "light",
      spacing: "spacing",
    });
  }, [themeMode]);

  useEffect(() => {
    dispatch(loadContext());
    dispatch(fetchProviders());
    dispatch(fetchConfig());
  }, [dispatch]);

  useEffect(() => {
    dispatch(refreshAuthStatus(provider));
  }, [provider, dispatch]);

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [auth.connected, provider, dispatch]);

  useEffect(() => {
    dispatch(fetchRepositories());
  }, [auth.connected, provider, workspace, dispatch]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<any>) => {
      if (
        [
          "OAUTH_COMPLETE",
          "GITHUB_CONNECTED",
          "BITBUCKET_CONNECTED",
          "SCA_AUTH_SUCCESS",
        ].includes(event.data?.type)
      ) {
        const msgProvider =
          event.data?.payload?.provider || event.data?.provider;
        if (!msgProvider || msgProvider === provider) {
          dispatch(refreshAuthStatus(provider));
          dispatch(setConnecting(false));
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [provider, dispatch]);

  useEffect(() => {
    if (!connecting) return;
    const timeoutId = setTimeout(() => {
      dispatch(setConnecting(false));
      dispatch(setGitError("Authentication timed out. Please try again."));
    }, 60000);

    const interval = setInterval(() => {
      dispatch(refreshAuthStatus(provider)).then((action: any) => {
        if (action.payload?.connected) {
          dispatch(setConnecting(false));
          clearInterval(interval);
          clearTimeout(timeoutId);
        }
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [connecting, provider, dispatch]);

  async function handleConnectGit(targetProvider: string) {
    dispatch(setProvider(targetProvider));
    dispatch(setConnecting(true));
    dispatch(setGitError(null));
    try {
      const data = await invoke<{ authUrl?: string }>("getGitAuthUrl", {
        provider: targetProvider,
      });
      console.log(data);
      if (data.authUrl) {
        await router.open(data.authUrl);
      } else {
        throw new Error("No authUrl returned from backend");
      }
    } catch (e: any) {
      dispatch(setConnecting(false));
      dispatch(setGitError(`Failed to start OAuth: ${e.message || String(e)}`));
    }
  }

  async function handleDisconnect() {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }
    setConfirmDisconnect(false);
    dispatch(disconnectGit());
  }

  function runSolve() {
    dispatch(solveTaskThunk({ provider, repoUrl, task: taskInput } as any));
  }

  const providerOptions = providers.map((p: any) => ({
    label: p.name,
    value: p.id,
  }));
  const providerOption =
    providerOptions.find((o: any) => o.value === provider) || null;
  const canRun = !running && !!repoUrl && !!taskInput && !!auth.connected;

  if (auth.loading) {
    return (
      <div
        className="oliver-root"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="oliver-root">
      <header className="oliver-header">
        <div className="oliver-inline oliver-spread">
          <div className="oliver-branding">
            <div className="oliver-logo-badge">OA</div>
            <Heading size="medium">OliverAI</Heading>
          </div>
          <div className="oliver-inline">
            <Button appearance="subtle" onClick={() => dispatch(toggleTheme())}>
              {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
            </Button>
          </div>
          {auth.connected &&
            (confirmDisconnect ? (
              <div className="oliver-inline">
                <Button
                  className="oliver-btn-warning"
                  appearance="warning"
                  onClick={handleDisconnect}
                >
                  Confirm
                </Button>
                <Button
                  className="oliver-btn-primary"
                  appearance="subtle"
                  onClick={() => setConfirmDisconnect(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="oliver-inline">
                <div style={{ marginRight: "8px" }}>
                  <Lozenge appearance="success" isBold>
                    Connected as {auth.username}
                  </Lozenge>
                </div>
                <Button
                  className="oliver-btn-warning"
                  appearance="subtle"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </div>
            ))}
        </div>
      </header>

      <main className="oliver-container oliver-fade-in">
        <div className="oliver-stack">
          {!auth.connected ? (
            <div className="oliver-card oliver-hero">
              <div className="oliver-stack">
                <Heading size="large">Welcome to OliverAI</Heading>
                <p>
                  Connect your Git account to start automating your Jira tasks
                  with AI. We'll help you fix bugs and implement features
                  directly in your codebase.
                </p>

                <div
                  className="oliver-stack"
                  style={{ maxWidth: "320px", margin: "0 auto", width: "100%" }}
                >
                  <LoadingButton
                    className="oliver-btn-primary"
                    appearance="primary"
                    onClick={() => handleConnectGit("github")}
                    isLoading={connecting && provider === "github"}
                    isDisabled={connecting}
                    shouldFitContainer
                  >
                    Connect GitHub
                  </LoadingButton>

                  <LoadingButton
                    className="oliver-btn-warning"
                    appearance="default"
                    onClick={() => handleConnectGit("bitbucket")}
                    isLoading={connecting && provider === "bitbucket"}
                    isDisabled={connecting}
                    shouldFitContainer
                  >
                    Connect Bitbucket
                  </LoadingButton>
                </div>

                <p style={{ fontSize: "11px", marginTop: "16px" }}>
                  OAuth is handled securely. We only access the repositories you
                  authorize.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="oliver-card">
                <div className="oliver-stack">
                  <Heading size="small">Configuration</Heading>

                  <div className="oliver-field-group">
                    <label className="oliver-label" htmlFor="incrementalToggle">
                      PR Creation Strategy
                    </label>
                    <div className="oliver-inline" style={{ marginTop: "4px" }}>
                      <Toggle
                        id="incrementalToggle"
                        isChecked={incrementalPrsOn}
                        isDisabled={configLoading}
                        onChange={(e: any) =>
                          dispatch(updateConfig(e.target.checked))
                        }
                      />
                      <span style={{ marginLeft: "8px", fontSize: "14px" }}>
                        {incrementalPrsOn ? "Incremental PRs" : "One BLOB PR"}
                      </span>
                    </div>
                  </div>

                  <div
                    className="oliver-inline oliver-spread"
                    style={{ alignItems: "flex-end" }}
                  >
                    <div
                      className="oliver-field-group"
                      style={{ flex: 1, minWidth: "240px" }}
                    >
                      <label className="oliver-label" htmlFor="provider">
                        Git Provider
                      </label>
                      <Select
                        inputId="provider"
                        value={providerOption}
                        options={providerOptions}
                        onChange={(opt: any) => {
                          if (opt?.value) dispatch(setProvider(opt.value));
                        }}
                        placeholder="Select provider"
                      />
                    </div>
                  </div>

                  {provider === "bitbucket" && (
                    <div className="oliver-field-group">
                      <label className="oliver-label" htmlFor="workspaceSelect">
                        Workspace
                      </label>
                      <Select
                        inputId="workspaceSelect"
                        value={(() => {
                          const matched = workspaces.find(
                            (w: any) => w.slug === workspace,
                          );
                          if (matched)
                            return {
                              label: matched.name || matched.slug,
                              value: workspace,
                            };
                          if (workspace)
                            return { label: workspace, value: workspace };
                          return null;
                        })()}
                        options={workspaces.map((w: any) => ({
                          label: w.name || w.slug,
                          value: w.slug,
                        }))}
                        onChange={(opt: any) => {
                          if (opt?.value && opt.value !== workspace) {
                            dispatch(setWorkspace(opt.value));
                          }
                        }}
                        placeholder={
                          workspacesLoading
                            ? "Loading workspaces..."
                            : "Select workspace..."
                        }
                        isLoading={workspacesLoading}
                      />
                    </div>
                  )}

                  <div className="oliver-field-group">
                    <label className="oliver-label" htmlFor="repoSelect">
                      Repository
                    </label>
                    <Select
                      inputId="repoSelect"
                      value={(() => {
                        const toCloneUrl = (r: any) =>
                          r.cloneUrl ||
                          (r.htmlUrl?.endsWith(".git")
                            ? r.htmlUrl
                            : `${r.htmlUrl}.git`);
                        const matched = repos.find(
                          (r: any) => toCloneUrl(r) === repoUrl,
                        );
                        if (matched)
                          return {
                            label:
                              matched.fullName ||
                              `${matched.owner}/${matched.name}`,
                            value: repoUrl,
                          };
                        if (repoUrl) return { label: repoUrl, value: repoUrl };
                        return null;
                      })()}
                      options={repos.map((r: any) => ({
                        label: r.fullName || `${r.owner}/${r.name}`,
                        value:
                          r.cloneUrl ||
                          (r.htmlUrl?.endsWith(".git")
                            ? r.htmlUrl
                            : `${r.htmlUrl}.git`),
                      }))}
                      onChange={(opt: any) =>
                        opt?.value && dispatch(setRepoUrl(opt.value))
                      }
                      placeholder={
                        reposLoading
                          ? "Loading repositories..."
                          : "Select repository..."
                      }
                      isLoading={reposLoading}
                    />
                    <div style={{ marginTop: "8px" }}>
                      <Textfield
                        id="repoUrl"
                        name="repoUrl"
                        value={repoUrl}
                        onChange={(e: any) =>
                          dispatch(setRepoUrl(e.target.value))
                        }
                        placeholder="Or enter URL manually: https://github.com/acme/project"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="oliver-card">
                <div className="oliver-stack">
                  <Heading size="small">Instruction</Heading>
                  <div className="oliver-field-group">
                    <label className="oliver-label" htmlFor="task">
                      What should OliverAI do?
                    </label>
                    <TextArea
                      id="task"
                      value={taskInput}
                      onChange={(e: any) =>
                        dispatch(setTaskInput(e.target.value))
                      }
                      minimumRows={6}
                      placeholder="Describe the task in detail..."
                    />
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <LoadingButton
                      className="oliver-btn-primary"
                      appearance="primary"
                      onClick={runSolve}
                      isDisabled={!canRun}
                      isLoading={running}
                    >
                      Run OliverAI
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </>
          )}

          {gitError && (
            <SectionMessage title="Git Error" appearance="error">
              {gitError}
            </SectionMessage>
          )}

          {configError && (
            <SectionMessage title="Configuration Error" appearance="error">
              {configError}
            </SectionMessage>
          )}

          {taskError && (
            <SectionMessage title="Task Operation Failed" appearance="error">
              {taskError}
            </SectionMessage>
          )}

          {warning && (
            <SectionMessage title="Note" appearance="warning">
              {warning}
            </SectionMessage>
          )}

          {(gitSuccess || taskSuccess || configSuccess) && (
            <SectionMessage title="Success" appearance="success">
              {gitSuccess && (
                <div
                  style={{
                    marginBottom: taskSuccess || configSuccess ? "4px" : "0",
                  }}
                >
                  {gitSuccess}
                </div>
              )}
              {configSuccess && (
                <div style={{ marginBottom: taskSuccess ? "4px" : "0" }}>
                  {configSuccess}
                </div>
              )}
              {taskSuccess && <div>{taskSuccess}</div>}
            </SectionMessage>
          )}

          {result && (
            <div className="oliver-card oliver-fade-in">
              <div className="oliver-stack">
                <Heading size="small">Agent Report</Heading>
                <div className="oliver-result-pre">
                  {typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2)}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
