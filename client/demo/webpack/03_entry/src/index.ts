interface EntryObj {
  [entryChunkName: string]: string | string[] | EntryValueObj;
}

interface EntryValueObj {
  import: string | [string];
  dependOn: string | [string];
  filename: string;
  layer: string;
}

type Entry = string | string[] | EntryObj;

let entry: Entry | (() => Entry);
