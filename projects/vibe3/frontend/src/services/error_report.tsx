import { serializeError } from 'serialize-error';
import { ModifyActionInputs } from '@/components/chat/types';

const reportError = (error: Error, operation: string, modifyActionOutput?: any) => {
    let _error: any
    try {
        _error = serializeError(error);
    } catch (e) {
        _error = error;
    }

    const body = { error: _error, page: location.href, operation, modify_action_input: modifyActionOutput };
    fetch("/api/log_error", {
        method: "POST",
        body: JSON.stringify(body),
    });
};

export { reportError };