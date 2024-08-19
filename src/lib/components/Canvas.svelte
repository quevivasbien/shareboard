<script lang="ts">
    import * as Konva from "svelte-konva";
    import { type Stage } from "konva/lib/Stage";

    import { textBoxInputStore, type ToolState } from "$lib/stores";
    import Line from "./Line.svelte";
    import TextBox from "./TextBox.svelte";
    import SelectedElements from "./SelectedElements.svelte";
    import Selection from "./Selection.svelte";
    import {
        LineData,
        SelectionData,
        TextBoxData,
        type CanvasElementData,
    } from "$lib/canvasElements";
    import { CanvasHistory } from "$lib/canvasState";
    import { BoundingBox, getBoundsAfterResize } from "$lib/geometry";

    // Bound values
    export let toolState: ToolState;
    export let undo: () => void;
    export let historyEmpty: boolean;
    export let save: () => void;

    let lastTool = toolState.activeTool;

    const BOARD_SIZE = {
        width: 1600,
        height: 1600,
    };

    const MIN_TEXTBOX_WIDTH_FACTOR = 8;
    const MIN_TEXTBOX_HEIGHT_FACTOR = 6;

    // Location of the mouse within the canvas
    let mousePosition: { x: number; y: number } = { x: 0, y: 0 };
    // Whether or not mouse button is currently pressed
    let mouseIsDown: boolean = false;
    // Used to track a recent mouse position for making changes with e.g. the eraser or a selection
    let lastMousePos: { x: number; y: number } | null = null;
    // The element that the mouse is currently hovering over
    let mouseOverElement: CanvasElementData | null = null;
    // Elements currently displayed on the canvas
    let elements: CanvasElementData[] = [];
    // Elements displayed on the canvas that are currently selected
    let selectedElements: CanvasElementData[] = [];
    // A line that is currently being drawn
    let currentLine: LineData | null = null;
    // A text box that is currently being edited
    let currentTextBox: TextBoxData | null = null;
    // Whether to allow the currently edited text box to be resized
    let allowResizeTextBox: boolean = false;
    // A selection that is actively being created (being dragged out)
    let currentSelection: SelectionData | null = null;
    // Whether the mouse is currently hovering over a selection
    // If hovering, describes where the mouse is within the selection
    //   using format `{horizontal}-{vertical}`
    let mouseOverSelection: string | null = null;
    // Whether a selection is being manipulated
    // If being manipulated, describes the type of manipulation,
    // One of: "move", "resize:{horizontal}-{vertical}"
    let selectionMode: string | null = null;
    // The background color of the canvas
    let backgroundColor: string = "white";
    // Keeps track of recent edits to the canvas
    let history: CanvasHistory = new CanvasHistory();

    function removeCurrentTextBox(addToElements: boolean) {
        if (!currentTextBox) {
            return;
        }
        if (addToElements && $textBoxInputStore?.value) {
            currentTextBox.text = $textBoxInputStore.value;
            elements = [...elements, currentTextBox];
            history.add("draw", currentTextBox);
            history = history;
        }
        textBoxInputStore.update((t) => {
            if (t) {
                t.value = "";
            }
            return t;
        });
        currentTextBox = null;
    }

    function makeSelections() {
        if (!currentSelection) {
            return;
        }
        const selectedIdxs = [];
        const unselectedIdxs = [];
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (currentSelection.contains(element)) {
                selectedIdxs.push(i);
            } else {
                unselectedIdxs.push(i);
            }
        }
        selectedElements = selectedIdxs.map((i) => elements[i]);
        elements = unselectedIdxs.map((i) => elements[i]);
        currentSelection = null;
    }

    function clearSelections() {
        elements = elements.concat(selectedElements);
        selectedElements = [];
    }

    function moveSelections() {
        if (!lastMousePos) {
            throw new Error(
                "Tried to move selection without active selection origin.",
            );
        }
        const dx = mousePosition.x - lastMousePos.x;
        const dy = mousePosition.y - lastMousePos.y;
        selectedElements = selectedElements.map((e) => {
            return e.move(dx, dy);
        });
        history.add("move", {
            elements: selectedElements,
            dx,
            dy,
        });
        history = history;
    }

    function resizeSelections() {
        if (!selectionMode) {
            throw new Error(
                "Tried to resize selection without active selection mode",
            );
        }
        const mode = selectionMode.split(":");
        if (mode.length !== 2) {
            return;
        }
        const [horizSource, vertSource] = mode[1].split("-");
        const boundsBefore = BoundingBox.union(
            selectedElements.map((e) => e.boundingBox()),
        );
        const boundsAfter = getBoundsAfterResize(
            boundsBefore,
            mousePosition,
            horizSource,
            vertSource,
        );
        selectedElements = selectedElements.map((e) => {
            return e.scale(boundsBefore, boundsAfter);
        });
        history.add("resize", {
            elements: selectedElements,
            boundsBefore,
            boundsAfter,
        });
        history = history;
    }

    function deleteSelections() {
        history.add("erase", selectedElements);
        selectedElements = [];
        history = history;
    }

    function resetSelections(setNoHover: boolean = false) {
        // Remove current selection if one is active and not being moved
        if (selectedElements.length !== 0 && !mouseOverSelection) {
            clearSelections();
        }
        // Deactivate current text box if one is active 
        removeCurrentTextBox(true);

        if (setNoHover) {
            elements = elements.map((e) => {
                e.mouseIsOver = false;  
                return e;
            });
        }
    }

    function handleMousedown(e: Konva.KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage()?.getPointerPosition();
        if (!pos) {
            return;
        }
        mouseIsDown = true;
        resetSelections();

        switch (toolState.activeTool) {
            case "pencil":
                currentLine = new LineData(
                    [pos.x, pos.y],
                    toolState.color,
                    toolState.size,
                    toolState.style,
                );
                break;

            case "line":
                currentLine = new LineData(
                    [pos.x, pos.y, pos.x, pos.y],
                    toolState.color,
                    toolState.size,
                    toolState.style,
                );
                break;

            case "eraser":
                lastMousePos = pos;
                break;

            case "text":
                // First check if the mouse is hovering over a pre-existing text box
                let idx = -1;
                for (let i = 0; i < elements.length; i++) {
                    if (elements[i].mouseIsOver && elements[i] instanceof TextBoxData) {
                        idx = i;
                        break;
                    }
                }
                console.log(idx);
                if (idx !== -1) {
                    // If so, select that text box
                    const textBox = elements[idx] as TextBoxData;
                    if ($textBoxInputStore !== null) {
                        $textBoxInputStore.value = textBox.text;
                    }
                    toolState.fontFace = textBox.fontFace;
                    toolState.fontSize = textBox.fontSize;
                    toolState.color = textBox.color;
                    textBox.mouseIsOver = false;  // Otherwise, the user won't be able to create new text boxes after selecting this one
                    currentTextBox = textBox;
                    elements = elements.slice(0, idx).concat(elements.slice(idx + 1));
                    allowResizeTextBox = false;
                    $textBoxInputStore?.focus();
                }
                else {
                    // Otherwise, create a new text box
                    currentTextBox = new TextBoxData(
                        "",
                        new BoundingBox(pos.x, pos.y, pos.x, pos.y),
                        toolState.color,
                        toolState.fontSize,
                        toolState.fontFace,
                    );
                    allowResizeTextBox = true;
                }
                break;

            case "selection":
                if (mouseOverSelection) {
                    lastMousePos = pos;
                } else {
                    currentSelection = new SelectionData(
                        new BoundingBox(pos.x, pos.y, pos.x, pos.y),
                    );
                }
                break;

            default:
                break;
        }
    }

    function setMouseHoverStates() {
        let madeChange = false;
        for (const element of elements) {
            const mouseIsOver = element.boundingBox().containsPoint({x: mousePosition.x, y: mousePosition.y});
            madeChange ||= mouseIsOver !== element.mouseIsOver;
            element.mouseIsOver = mouseIsOver;
        }
        if (madeChange) {
            elements = elements;
        }
    }

    function handleMousemove(e: Konva.KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage()?.getPointerPosition();
        if (!pos) {
            return;
        }
        mousePosition = pos;
        
        const activeTool = toolState.activeTool;
        if (activeTool === "text" || activeTool === "selection") {
            setMouseHoverStates();
        }
        
        if (!mouseIsDown) {
            return;
        }

        switch (activeTool) {
            case "pencil":
                if (!currentLine) {
                    return;
                }
                currentLine.points = [...currentLine.points, pos.x, pos.y];
                break;

            case "line":
                if (!currentLine) {
                    return;
                }
                const startX = currentLine.points[0];
                const startY = currentLine.points[1];
                // If line is close to straight, lock to straight
                const slope = (startY - pos.y) / (startX - pos.x);
                const slopeTol = 40;
                if (Math.abs(slope) < 1 / slopeTol) {
                    currentLine.points = [startX, startY, pos.x, startY];
                } else if (Math.abs(slope) > slopeTol) {
                    currentLine.points = [startX, startY, startX, pos.y];
                } else {
                    currentLine.points = [startX, startY, pos.x, pos.y];
                }
                break;

            case "eraser":
                if (!lastMousePos) {
                    return;
                }
                const ax = lastMousePos.x;
                const ay = lastMousePos.y;
                const bx = pos.x;
                const by = pos.y;
                // Look for elements that intersect line AB
                elements = elements.filter((element) => {
                    if (element.intersects([ax, ay, bx, by])) {
                        history.add("erase", [element]);
                        return false;
                    }
                    return true;
                });
                history = history;
                break;

            case "text":
                if (!currentTextBox || !allowResizeTextBox) {
                    return;
                }
                currentTextBox.bounds.x1 = pos.x;
                currentTextBox.bounds.y1 = pos.y;
                break;

            case "selection":
                if (currentSelection) {
                    currentSelection.bounds.x1 = pos.x;
                    currentSelection.bounds.y1 = pos.y;
                }
                break;

            default:
                break;
        }
    }

    function handleMouseup(e: Konva.KonvaMouseEvent) {
        mouseIsDown = false;
        if (
            toolState.activeTool === "pencil" ||
            toolState.activeTool === "line"
        ) {
            if (!currentLine) {
                return;
            }
            elements = [...elements, currentLine];
            history.add("draw", currentLine);
            history = history;
            currentLine = null;
        } else if (toolState.activeTool === "eraser") {
            lastMousePos = null;
        } else if (toolState.activeTool === "text") {
            if (!currentTextBox) {
                return;
            }
            if (allowResizeTextBox) {
                currentTextBox = currentTextBox.setMinimumSize();
            }
            $textBoxInputStore?.focus();
        } else if (toolState.activeTool === "selection") {
            if (lastMousePos) {
                if (selectionMode === "move") {
                    moveSelections();
                } else {
                    resizeSelections();
                }
                lastMousePos = null;
            }
            makeSelections();
        }
    }

    $: if (toolState.activeTool !== lastTool) {
        lastTool = toolState.activeTool;
        resetSelections(true);
    }

    addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
            resetSelections(false);
        }
        // Capture Ctrl+Z
        else if (e.ctrlKey && e.key === "z") {
            undo();
        }
        // Capture delete selection
        else if (selectedElements.length !== 0 && e.key === "Delete") {
            deleteSelections();
        }
    });

    undo = () => {
        resetSelections(false);
        const lastAction = history.pop();
        if (lastAction) {
            if (lastAction.type === "draw") {
                elements = elements.filter(
                    (element) => element !== lastAction.payload,
                );
            } else if (lastAction.type === "erase") {
                elements = [
                    ...elements,
                    ...(lastAction.payload as CanvasElementData[]),
                ];
            } else if (lastAction.type === "move") {
                const { payload } = lastAction;
                elements = elements.map((e: CanvasElementData) => {
                    if (payload.elements.includes(e)) {
                        return e.move(-payload.dx, -payload.dy);
                    } else {
                        return e;
                    }
                });
            } else if (lastAction.type === "resize") {
                const { payload } = lastAction;
                elements = elements.map((e: CanvasElementData) => {
                    if (payload.elements.includes(e)) {
                        return e.scale(
                            payload.boundsAfter,
                            payload.boundsBefore,
                        );
                    } else {
                        return e;
                    }
                });
            }
        }
        history = history;
    };
    $: historyEmpty = history.empty;

    let stage: Stage;
    save = () => {
        // Save current canvas as an image
        const dataURL = stage.toDataURL();
        const a = document.createElement("a");
        a.href = dataURL;
        a.download = "shareboard.png";
        a.click();
        a.remove();
    };

    let cursorType: string;
    $: {
        if (toolState.activeTool === "line") {
            cursorType = "crosshair";
        } else if (toolState.activeTool === "selection") {
            cursorType = "auto";
        } else {
            cursorType = toolState.activeTool;
        }
    }

    function setSelectionMode(mouseOverSelection: string | null) {
        if (mouseIsDown) {
            return;
        }
        if (toolState.activeTool !== "selection") {
            selectionMode = null;
        } else if (!mouseOverSelection) {
            selectionMode = "select";
            cursorType = "auto";
        } else if (mouseOverSelection === "center-center") {
            selectionMode = "move";
            cursorType = "grab";
        } else {
            selectionMode = `resize:${mouseOverSelection}`;
            if (
                mouseOverSelection === "left-top" ||
                mouseOverSelection === "right-bottom"
            ) {
                cursorType = "nwse-resize";
            } else if (
                mouseOverSelection === "left-bottom" ||
                mouseOverSelection === "right-top"
            ) {
                cursorType = "nesw-resize";
            } else if (
                mouseOverSelection === "left-center" ||
                mouseOverSelection === "right-center"
            ) {
                cursorType = "ew-resize";
            } else if (
                mouseOverSelection === "center-top" ||
                mouseOverSelection === "center-bottom"
            ) {
                cursorType = "ns-resize";
            }
        }
    }

    $: setSelectionMode(mouseOverSelection);

    $: if ($textBoxInputStore) {
        $textBoxInputStore.style.display = currentTextBox ? "block" : "none";
    }

    $: if (toolState.activeTool == "text" && currentTextBox) {
        currentTextBox.color = toolState.color;
        currentTextBox.fontFace = toolState.fontFace;
        currentTextBox.fontSize = toolState.fontSize;
        if ($textBoxInputStore) {
            $textBoxInputStore.style.color = currentTextBox.color;
            $textBoxInputStore.style.fontFamily = currentTextBox.fontFace;
            $textBoxInputStore.style.fontSize = currentTextBox.fontSize + "px";
            $textBoxInputStore.focus();
        }
    }
</script>

<Konva.Stage
    bind:handle={stage}
    class="cursor-{cursorType}"
    config={{ width: BOARD_SIZE.width, height: BOARD_SIZE.height }}
    on:mousedown={handleMousedown}
    on:mousemove={handleMousemove}
    on:mouseup={handleMouseup}
>
    <Konva.Layer>
        <Konva.Rect
            config={{
                width: BOARD_SIZE.width,
                height: BOARD_SIZE.height,
                fill: backgroundColor,
            }}
        ></Konva.Rect>
    </Konva.Layer>
    <Konva.Layer>
        {#each elements as element}
            <svelte:component
                this={element.componentType()}
                data={element}
            />
        {/each}
        {#if currentLine}
            <Line data={currentLine} />
        {/if}
        {#if currentTextBox}
            <TextBox data={currentTextBox} active={true} />
        {/if}
        {#if currentSelection}
            <Selection data={currentSelection} />
        {/if}
        {#if selectedElements.length !== 0}
            <SelectedElements
                elements={selectedElements}
                bind:mouseOverSelection
                {selectionMode}
                {mousePosition}
                moveOrigin={lastMousePos}
            />
        {/if}
    </Konva.Layer>
</Konva.Stage>
