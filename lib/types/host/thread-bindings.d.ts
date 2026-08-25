/** On-disk binding record. */
export interface ThreadBinding {
    version: 1;
    taskId: string;
    threadId: string;
    /** sha256 of the normalized absolute working directory. */
    cwdFingerprint: string;
    /** Codex CLI version that created the thread. */
    cliVersion?: string;
    createdAt: number;
}
/** Resolve the binding directory: DSH_HOME env (or explicit override), else ~/.dsh. */
export declare function bindingDirectory(explicitHome?: string): string;
/** Fingerprint a normalized absolute cwd. */
export declare function fingerprintCwd(cwd: string): string;
/** File name for one task's binding (taskId is a uuid; still encode defensively). */
export declare function bindingPath(directory: string, taskId: string): string;
/** Structural + semantic validation of one parsed binding file. */
export declare function parseBinding(raw: string): ThreadBinding | undefined;
/**
 * Persist one binding atomically: random temp file in the target directory
 * (mode 0600), flush+close, then rename into place.
 */
export declare function saveBinding(directory: string, binding: ThreadBinding): Promise<void>;
/** Load and validate one binding; undefined when missing or malformed. */
export declare function loadBinding(directory: string, taskId: string): Promise<ThreadBinding | undefined>;
/** Remove one binding (idempotent); leaves unrelated files alone. */
export declare function removeBinding(directory: string, taskId: string): Promise<void>;
//# sourceMappingURL=thread-bindings.d.ts.map