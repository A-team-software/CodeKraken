import { Task } from "../api/types/task";

export interface ProjectManagerAdapter<TRemoteTask> {
    remoteTaskToLocalTask(remoteTask: TRemoteTask): Task;
}
