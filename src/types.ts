export type RemarqUser = {
  id: string;
  name: string;
  avatar?: string;
  color: string;
};

export type RemarqComment = {
  id: string;
  threadId: string;
  author: RemarqUser;
  body: string;
  createdAt: string;
};

export type RemarqThread = {
  id: string;
  pageId: string;
  pinX: number;
  pinY: number;
  targetId?: string;
  targetLabel?: string;
  resolved: boolean;
  comments: RemarqComment[];
  createdAt: string;
};

export type RemarqStorage = {
  load(pageId: string): Promise<RemarqThread[]>;
  save(pageId: string, threads: RemarqThread[]): Promise<void>;
};
