import React, { useEffect, useState } from 'react'

const STORAGE_KEY = 'ResizePanel:'
const savePanelHeight = (key: string, height: number): void => localStorage.setItem(key, String(height))

const getCachedPanelHeight = (storageKey: string, defaultHeight: number): number => {
    const storedHeight = localStorage.getItem(`${STORAGE_KEY}${storageKey}`)
    if (storedHeight !== null) {
        const sizeNumber = parseInt(storedHeight, 10)
        if (sizeNumber >= 0) {
            return sizeNumber
        }
    }
    return defaultHeight
}

export const usePanelResizer = (
    resizeReference: React.MutableRefObject<HTMLDivElement | null>,
    storageKey: string,
    defaultHeight: number
): { panelHeight: number } => {
    const [panelHeight, setPanelHeight] = useState(getCachedPanelHeight(storageKey, defaultHeight))

    useEffect(() => {
        let height = panelHeight
        let startHeight = 0

        const resizePanel = (event: MouseEvent): void => {
            const heightDiff = event.clientY - startHeight
            height = height - heightDiff
            startHeight = event.clientY
            setPanelHeight(height)
        }

        const stopResizing = (): void => {
            document.removeEventListener('mouseup', stopResizing)
            document.removeEventListener('mousemove', resizePanel)
            savePanelHeight(`${STORAGE_KEY}${storageKey}`, height)
        }

        const startResizing = (event: MouseEvent): void => {
            startHeight = event.clientY

            document.addEventListener('mousemove', resizePanel)
            document.addEventListener('mouseup', stopResizing)
        }

        // Add mousedown event listener
        const resizer = resizeReference.current
        resizer?.addEventListener('mousedown', startResizing)

        return () => resizer?.removeEventListener('mousedown', startResizing)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey, defaultHeight])

    return { panelHeight }
}
