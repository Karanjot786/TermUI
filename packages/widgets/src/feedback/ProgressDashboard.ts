export type TaskStatus = "running" | "success" | "warning" | "error";

export interface ProgressTask {
    id: string;
    name: string;
    progress: number;
    status: TaskStatus;
    eta?: string;
}

export interface ProgressDashboardOptions {
    tasks?: ProgressTask[];
}

export class ProgressDashboard {
    private tasks: ProgressTask[];

    constructor(options: ProgressDashboardOptions = {}) {
        this.tasks = options.tasks ?? [];
    }

    getTasks(): ProgressTask[] {
        return this.tasks;
    }

    addTask(task: ProgressTask): void {
        this.tasks.push(task);
    }

    updateProgress(id: string, progress: number): void {
        const task = this.tasks.find(task => task.id === id);

        if (task) {
            task.progress = Math.max(0, Math.min(100, progress));
        }
    }

    updateStatus(id: string, status: TaskStatus): void {
        const task = this.tasks.find(task => task.id === id);

        if (task) {
            task.status = status;
        }
    }

    updateETA(id: string, eta: string): void {
        const task = this.tasks.find(task => task.id === id);

        if (task) {
            task.eta = eta;
        }
    }

    removeTask(id: string): void {
        this.tasks = this.tasks.filter(
            task => task.id !== id
        );
    }
}