import { Task } from "../types/task";

export interface ProjectManagerAdapter<TRemoteTask> {
    remoteTaskToLocalTask(remoteTask: TRemoteTask): Task;
}
