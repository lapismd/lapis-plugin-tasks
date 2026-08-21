export type TaskListPickerOption = {
  id?: string;
  title: string;
  path?: string;
  breadcrumb?: string[];
};

export type TaskListPickerOptionInput = string | TaskListPickerOption;
