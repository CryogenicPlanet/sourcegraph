import { TextDocumentPositionParameters } from '@sourcegraph/shared/src/api/protocol'
import { AbsoluteRepoFilePosition, toURIWithPath } from '@sourcegraph/shared/src/util/url'

export const toTextDocumentPositionParameters = (
    position: AbsoluteRepoFilePosition
): TextDocumentPositionParameters => ({
    textDocument: {
        uri: toURIWithPath(position),
    },
    position: {
        character: position.position.character - 1,
        line: position.position.line - 1,
    },
})
