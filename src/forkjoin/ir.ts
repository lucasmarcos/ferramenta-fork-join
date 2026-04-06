export interface Command {
  label: string;
  id: string;
  forks: string[];
  joins: string[];
}

export interface Block {
  name: string;
  commands: Command[];
}
