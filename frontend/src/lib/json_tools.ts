// 给定 id，返回 id 对应的任务
// import { Task } from '@/app/components/materials/TaskItem';
// import { OutlineTask } from '@/app/components/outline/TaskItem';
import { BaseTask } from '@/lib/task'

export function findTaskById(tasks: BaseTask[], id: number): BaseTask | undefined {
  for (const task of tasks) {
    if (task.id === id) {
      return task;
    }
    if (task.sub_tasks) {
      const found = findTaskById(task.sub_tasks, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

export function replaceTask(tasks: BaseTask[], newTask: BaseTask) {
  const id = newTask.id;
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (task.id === id) {
      tasks[i] = newTask;
      return;
    }
    if (task.sub_tasks) {
      replaceTask(task.sub_tasks, newTask);
    }
  }
}


export function findParentTaskById(tasks: BaseTask[], id: number): BaseTask | undefined | string {
  for (const task of tasks) {
    if (task.id === id) {
      return 'root';
    }
    if (task.sub_tasks) {
      const found = findParentTaskById(task.sub_tasks, id);
      if (found == 'root') {
        return task;
      } 
      // 如果是Task
      else if (typeof found === 'object') {
        return found;
      }
    }
  }
  return 'not found';
}


export function findTaskBreadcrumb(tasks: BaseTask[], id: number): BaseTask[] | undefined {
  for (const task of tasks) {
    if (task.id === id) {
      return [task];
    }
    const subbreadcrumb = findTaskBreadcrumb(task.sub_tasks??[], id);
    if (subbreadcrumb) {
      return [task, ...subbreadcrumb];
    }
  }
}
