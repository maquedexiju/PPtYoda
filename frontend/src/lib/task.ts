export interface BaseTask {
    id: string | number;
    name: string;
    sub_tasks?: BaseTask[];
}