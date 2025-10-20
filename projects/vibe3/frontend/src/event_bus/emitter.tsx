import mitt from 'mitt';

type Events = {
  appEdited: boolean;
  saveManualEdit: undefined;
  discardApp: undefined;
  refreshApp: undefined;
  previewPathChange: string;
  downloadApp: undefined;
  autoSaveApp: undefined;
  updateAppName: string;
  editorTabChange: {focus: string, opened: string[]};
  sourceCodeOpen: string; 

  // llm tool call approval
  ToolCallApprovalEvent: {
    toolCallId: string;
    result: 'approved' | 'rejected';
  };
};

export const emitter = mitt<Events>();