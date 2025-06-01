import { useState, useCallback } from 'react';
import { ReactZoomPanPinchState } from 'react-zoom-pan-pinch';

export interface PanZoomState {
    positionX: number;
    positionY: number;
    scale: number;
}

export const usePanZoomLogic = (initialState?: Partial<PanZoomState>) => {
    const [transformState, setTransformState] = useState<PanZoomState>({
        positionX: initialState?.positionX || 0,
        positionY: initialState?.positionY || 0,
        scale: initialState?.scale || 1,
    });

    const onTransform = useCallback((ref: any, state: ReactZoomPanPinchState) => {
        setTransformState({ 
            positionX: state.positionX,
            positionY: state.positionY,
            scale: state.scale 
        });
    }, []);

    const screenToCanvasCoordinates = useCallback((screenX: number, screenY: number, canvasRect: DOMRect | null) => {
        if (!canvasRect) return { x: 0, y: 0 };
        const canvasX = (screenX - canvasRect.left - transformState.positionX) / transformState.scale;
        const canvasY = (screenY - canvasRect.top - transformState.positionY) / transformState.scale;
        return { x: canvasX, y: canvasY };
    }, [transformState]);

    const canvasToScreenCoordinates = useCallback((canvasX: number, canvasY: number, canvasRect: DOMRect | null) => {
        if (!canvasRect) return { x: 0, y: 0 };
        const screenX = (canvasX * transformState.scale) + transformState.positionX + canvasRect.left;
        const screenY = (canvasY * transformState.scale) + transformState.positionY + canvasRect.top;
        return { x: screenX, y: screenY };
    }, [transformState]);

    // Add other pan/zoom related logic or helper functions here if needed

    return {
        transformState,
        setTransformState, // Expose setter if manual updates are needed from outside the hook based on library events
        onTransform,       // Callback for the library
        screenToCanvasCoordinates,
        canvasToScreenCoordinates,
    };
}; 