const ps = new PerfectScrollbar('#cells', {
    wheelSpeed: 12,
    wheelPropagation: true
});

function findRowCol(ele) {
    let idArray = $(ele).attr("id").split("-");
    let rowId = parseInt(idArray[1]);
    let colId = parseInt(idArray[3]);
    return [rowId, colId];
}

function calcColName(n){
    let str = "";
    while (n > 0) {
        let rem = n % 26;
        if (rem == 0) {
            str = 'Z' + str;
            n = Math.floor(n / 26) - 1;
        }
        else {
            str = String.fromCharCode((rem - 1) + 65) + str;
            n = Math.floor(n / 26);
        }
    }
    return str;
}

for (let i = 1; i <= 100; i++) {
    let str = calcColName(i);
    $("#columns").append(`<div class="column-name">${str}</div>`);
    $("#rows").append(`<div class="row-name">${i}</div>`);
}

$("#cells").scroll(function () {
    $("#columns").scrollLeft(this.scrollLeft);
    $("#rows").scrollTop(this.scrollTop);
});

let cellData = { "sheet1": {} };
let saved = true;
let totalSheets = 1;
let lastlyAddedSheetNumber = 1;
let selectedSheet = "sheet1";

let mousemoved = false;
let startCellStored = false;
let startCell;
let endCell;

let defaultProperties = {
    "font-family": "Noto Sans",
    "font-size": "14",
    "text": "",
    "bold": false,
    "italic": false,
    "underlined": false,
    "alignment": "left",
    "color": "#444",
    "bgcolor": "#fff",
    "upStream": [],
    "downStream": [],
};

function loadNewSheet() {
    $("#cells").text("");
    for (let i = 1; i <= 100; i++) {
        let row = $(`<div class="cell-row"></div>`);
        for (let j = 1; j <= 100; j++) {
            row.append(`<div id="row-${i}-col-${j}" class="input-cell" contenteditable="false"></div>`);
        }
        $("#cells").append(row);
    }
    addEventsToCells();
    addSheetTabEventListeners();
}

loadNewSheet();

// function addNewSheet(){
//     $(".input-cell").text("");
//     $(".input-cell").css(
//         {
//             "font-family": "Noto Sans",
//             "font-size": "14",
//             "text": "",
//             "bold": false,
//             "italic": false,
//             "underlined": false,
//             "alignment": "left",
//             "color": "#444",
//             "background-color": "#fff"
//         }
//     );
//     addSheetTabEventListeners();
// }

function addEventsToCells() {

    $(".input-cell").dblclick(function () {
        $(this).attr("contenteditable", true);
        $(this).focus();
    });

    $(".input-cell").blur(function () {
        $(this).attr("contenteditable", false);
        // let [rowId, colId] = findRowCol(this);
        // cellData[selectedSheet][rowId-1][colId-1].text = $(this).text();
        updateCellData("text", $(this).text());
    });

    $(".input-cell").click(function (e) {
        let [rowId, colId] = findRowCol(this);
        let [topCell, leftCell, rightCell, bottomCell] = getTopLeftRightBottomCell(rowId, colId);
        if ($(this).hasClass("selected") && e.ctrlKey) {
            unSelectCell(this, e, topCell, leftCell, rightCell, bottomCell);
        }
        else {
            selectCell(this, e, topCell, leftCell, rightCell, bottomCell);
        }
    });

    $(".input-cell").mousemove(function (event) {
        event.preventDefault();
        if (event.buttons == 1 && !event.ctrlKey) {
            $(".input-cell.selected").removeClass("selected top-selected bottom-selected right-selected left-selected");
            mousemoved = true;
            if (!startCellStored) {
                let [rowId, colId] = findRowCol(event.target);
                startCell = { rowId: rowId, colId: colId };
                startCellStored = true;
            }
            else {
                let [rowId, colId] = findRowCol(event.target);
                endCell = { rowId: rowId, colId: colId };
                selectAllTheCellBetweenTheRange(startCell, endCell);
            }
        }
        else if (event.buttons == 0 && mousemoved) {
            startCellStored = false;
            mousemoved = false;
        }
    });
}

function getTopLeftRightBottomCell(rowId, colId) {
    let topCell = $(`#row-${rowId - 1}-col-${colId}`);
    let leftCell = $(`#row-${rowId}-col-${colId - 1}`);
    let rightCell = $(`#row-${rowId}-col-${colId + 1}`);
    let bottomCell = $(`#row-${rowId + 1}-col-${colId}`);
    return [topCell, leftCell, rightCell, bottomCell];
}

function selectCell(ele, e, topCell, leftCell, rightCell, bottomCell, mouseSelection) {
    if (e.ctrlKey || mouseSelection) {
        let topSelected;
        if (topCell) {
            topSelected = topCell.hasClass("selected");
        }

        let bottomSelected;
        if (bottomCell) {
            bottomSelected = bottomCell.hasClass("selected");
        }

        let leftSelected;
        if (leftCell) {
            leftSelected = leftCell.hasClass("selected");
        }

        let rightSelected;
        if (rightCell) {
            rightSelected = rightCell.hasClass("selected");
        }

        if (topSelected) {
            topCell.addClass("bottom-selected");
            $(ele).addClass("top-selected");
        }

        if (leftSelected) {
            leftCell.addClass("right-selected");
            $(ele).addClass("left-selected");
        }

        if (rightSelected) {
            rightCell.addClass("left-selected");
            $(ele).addClass("right-selected");
        }

        if (bottomSelected) {
            bottomCell.addClass("top-selected");
            $(ele).addClass("bottom-selected");
        }
    }
    else {
        $(".input-cell.selected").removeClass("selected top-selected bottom-selected right-selected left-selected");
    }
    $(ele).addClass("selected");
    changeHeader(findRowCol(ele));
}

function changeHeader([rowId, colId]) {
    let data;
    if (cellData[selectedSheet][rowId - 1] && cellData[selectedSheet][rowId - 1][colId - 1]) {
        data = cellData[selectedSheet][rowId - 1][colId - 1];
    }
    else {
        data = defaultProperties;
    }
    $("#font-family").val(data["font-family"]);
    $("#font-family").css("font-family", data["font-family"]);
    $("#font-size").val(data["font-size"]);
    $(".alignment.selected").removeClass("selected");
    $(`.alignment[data-type=${data.alignment}]`).addClass("selected");
    addRemoveSelectFromFontStyle(data, "bold");
    addRemoveSelectFromFontStyle(data, "italic");
    addRemoveSelectFromFontStyle(data, "underlined");
    $("#fill-color-icon").css("border-bottom", `4px solid ${data.bgcolor}`);
    $("#text-color-icon").css("border-bottom", `4px solid ${data.color}`);
}

function addRemoveSelectFromFontStyle(data, property) {
    if (data[property]) {
        $(`#${property}`).addClass("selected");
    }
    else {
        $(`#${property}`).removeClass("selected");
    }
}

function unSelectCell(ele, e, topCell, leftCell, rightCell, bottomCell) {
    if ($(ele).attr("contenteditable") == "false") {
        if ($(ele).hasClass("selected")) {
            if ($(ele).hasClass("top-selected")) {
                topCell.removeClass("bottom-selected");
            }
            if ($(ele).hasClass("left-selected")) {
                leftCell.removeClass("right-selected");
            }
            if ($(ele).hasClass("bottom-selected")) {
                bottomCell.removeClass("top-selected");
            }
            if ($(ele).hasClass("right-selected")) {
                rightCell.removeClass("left-selected");
            }
            $(ele).removeClass("selected top-selected bottom-selected right-selected left-selected");
        }
    }
}

function selectAllTheCellBetweenTheRange(start, end) {
    for (let i = (start.rowId <= end.rowId ? start.rowId : end.rowId); i <= (start.rowId < end.rowId ? end.rowId : start.rowId); i++) {
        for (let j = (start.colId <= end.colId ? start.colId : end.colId); j <= (start.colId < end.colId ? end.colId : start.colId); j++) {
            let [topCell, leftCell, rightCell, bottomCell] = getTopLeftRightBottomCell(i, j);
            selectCell($(`#row-${i}-col-${j}`)[0], {}, topCell, leftCell, rightCell, bottomCell, true);
        }
    }
}

$(".menu-selector").change(function (e) {
    let value = $(this).val();
    let key = $(this).attr("id");
    if (key == "font-family") {
        $("#font-family").css(key, value);
    }
    if (!isNaN(value)) {
        value = parseInt(value);
    }
    $(".input-cell.selected").css(key, value);
    // $(".input-cell.selected").each(function(index, data){
    //     let [rowId, colId] = findRowCol(data);
    //     cellData[selectedSheet][rowId-1][colId-1][key] = value;
    // });
    updateCellData(key, value);
})

$(".alignment").click(function (e) {
    $(".alignment.selected").removeClass("selected");
    $(this).addClass("selected");
    let alignment = $(this).attr("data-type");
    $(".input-cell.selected").css("text-align", alignment);
    // $(".input-cell.selected").each(function (index, data) {
    //     let [rowId, colId] = findRowCol(data);
    //     cellData[selectedSheet][rowId - 1][colId - 1].alignment = alignment;
    // });
    updateCellData("alignment", alignment);
});

$("#bold").click(function (e) {
    setFontStyle(this, "bold", "font-weight", "bold");
});

$("#italic").click(function (e) {
    setFontStyle(this, "italic", "font-style", "italic");
});

$("#underlined").click(function (e) {
    setFontStyle(this, "underlined", "text-decoration", "underline");
});

function setFontStyle(ele, property, key, value) {
    if ($(ele).hasClass("selected")) {
        $(ele).removeClass("selected");
        $(".input-cell.selected").css(key, "");
        // $(".input-cell.selected").each(function (index, data) {
        //     let [rowId, colId] = findRowCol(data);
        //     cellData[selectedSheet][rowId - 1][colId - 1][property] = false;
        // });
        updateCellData(property, false);
    }
    else {
        $(ele).addClass("selected");
        $(".input-cell.selected").css(key, value);
        // $(".input-cell.selected").each(function (index, data) {
        //     let [rowId, colId] = findRowCol(data);
        //     cellData[selectedSheet][rowId - 1][colId - 1][property] = true;
        // });
        updateCellData(property, true);
    }
}

function updateCellData(property, value) {
    let prevCellData = JSON.stringify(cellData);
    if (value != defaultProperties[property]) {
        $(".input-cell.selected").each(function (index, data) {
            let [rowId, colId] = findRowCol(data);
            if (cellData[selectedSheet][rowId - 1] == undefined) {
                cellData[selectedSheet][rowId - 1] = {};
                cellData[selectedSheet][rowId - 1][colId - 1] = { ...defaultProperties, "upStream": [], "downStream": [] };
                cellData[selectedSheet][rowId - 1][colId - 1][property] = value;
            }
            else {
                if (cellData[selectedSheet][rowId - 1][colId - 1] == undefined) {
                    cellData[selectedSheet][rowId - 1][colId - 1] = { ...defaultProperties, "upStream": [], "downStream": [] };
                    cellData[selectedSheet][rowId - 1][colId - 1][property] = value;
                }
                else {
                    cellData[selectedSheet][rowId - 1][colId - 1][property] = value;
                }
            }
        });
    }
    else {
        $(".input-cell.selected").each(function (index, data) {
            let [rowId, colId] = findRowCol(data);
            if (cellData[selectedSheet][rowId - 1] && cellData[selectedSheet][rowId - 1][colId - 1]) {
                cellData[selectedSheet][rowId - 1][colId - 1][property] = value;
                if (JSON.stringify(cellData[selectedSheet][rowId - 1][colId - 1]) == JSON.stringify(defaultProperties)) {
                    delete cellData[selectedSheet][rowId - 1][colId - 1];
                    if (Object.keys(cellData[selectedSheet][rowId - 1]).length == 0) {
                        delete cellData[selectedSheet][rowId - 1];
                    }
                }
            }
        });
    }
    if (saved && JSON.stringify(cellData) != prevCellData) {
        saved = false;
    }
}

$(".color-pick").colorPick({
    'initialColor': '#TypeColor',
    'allowRecent': true,
    'recentMax': 5,
    'allowCustomColor': true,
    'palette': ["#1abc9c", "#16a085", "#2ecc71", "#27ae60", "#3498db", "#2980b9", "#9b59b6", "#8e44ad", "#34495e", "#2c3e50", "#f1c40f", "#f39c12", "#e67e22", "#d35400", "#e74c3c", "#c0392b", "#ecf0f1", "#bdc3c7", "#95a5a6", "#7f8c8d"],
    'onColorSelected': function () {
        if (this.color != "#TypeColor") {
            if (this.element.attr("id") == "fill-color") {
                fillTextColor(this, "background-color", "bgcolor", "fill-color-icon");
            }
            else {
                fillTextColor(this, "color", "color", "text-color-icon");
            }
        }
    }
});

function fillTextColor(ele, style, property, id) {
    $(`#${id}`).css("border-bottom", `4px solid ${ele.color}`);
    $(".input-cell.selected").css(`${style}`, ele.color);
    // $(".input-cell.selected").each((index, data) => {
    //     let [rowId, colId] = findRowCol(data);
    //     cellData[selectedSheet][rowId-1][colId-1][property] = ele.color;
    // });
    updateCellData(property, ele.color);
}

$("#fill-color-icon, #text-color-icon").click(function (e) {
    setTimeout(() => {
        $(this).parent().click();
    }, 10);
});

$(".container").click(function (e) {
    $(".sheet-options-modal").remove();
});

function selectSheet(ele) {
    $(".sheet-tab.selected").removeClass("selected");
    $(ele).addClass("selected");
    emptySheet();
    selectedSheet = $(ele).text();
    loadSheet();
}

function emptySheet() {
    let data = cellData[selectedSheet];
    let rowKeys = Object.keys(data);
    for (let i of rowKeys) {
        let rowId = parseInt(i);
        let colKeys = Object.keys(data[rowId]);
        for (let j of colKeys) {
            let colId = parseInt(j);
            let cell = $(`#row-${rowId + 1}-col-${colId + 1}`);
            cell.text("");
            cell.css({
                "font-family": "Noto Sans",
                "font-size": 14,
                "background-color": "#fff",
                "color": "#444",
                "font-weight": "",
                "font-style": "",
                "text-decoration": "",
                "text-align": "left"
            });
        }
    }
}

function loadSheet() {
    let data = cellData[selectedSheet];
    let rowKeys = Object.keys(data);
    for (let i of rowKeys) {
        let rowId = parseInt(i);
        let colKeys = Object.keys(data[rowId]);
        for (let j of colKeys) {
            let colId = parseInt(j);
            let cell = $(`#row-${rowId + 1}-col-${colId + 1}`);
            cell.text(data[rowId][colId].text);
            cell.css({
                "font-family": data[rowId][colId]["font-family"],
                "font-size": data[rowId][colId]["font-size"],
                "background-color": data[rowId][colId]["bgcolor"],
                "color": data[rowId][colId].color,
                "font-weight": data[rowId][colId].bold ? "bold" : "",
                "font-style": data[rowId][colId].italic ? "italic" : "",
                "text-decoration": data[rowId][colId].underlined ? "underline" : "",
                "text-align": data[rowId][colId].alignment
            });
        }
    }
}

function addLoader() {
    $(".container").append(`<div class="sheet-modal-parent loader-parent">
                            <div class="loading-image"><img src="loader.gif" alt=""></div>
                            <div class="loading">Loading...</div>
                        </div>`);
}

function removeLoader() {
    $(".loader-parent").remove();
}

$(".add-sheet").click(function (e) {
    emptySheet();
    totalSheets++;
    lastlyAddedSheetNumber++;
    while (Object.keys(cellData).includes("sheet" + lastlyAddedSheetNumber)) {
        lastlyAddedSheetNumber++;
    }
    cellData[`sheet${lastlyAddedSheetNumber}`] = {};
    selectedSheet = `sheet${lastlyAddedSheetNumber}`;
    $(".sheet-tab.selected").removeClass("selected");
    $(".sheet-tab-container").append(
        `<div class="sheet-tab selected">sheet${lastlyAddedSheetNumber}</div>`
    );
    $(".sheet-tab.selected")[0].scrollIntoView();
    addSheetTabEventListeners();
    $("#row-1-col-1").click();
    saved = false;
})

function addSheetTabEventListeners() {
    $(".sheet-tab.selected").bind("contextmenu", function (e) {
        e.preventDefault();
        $(".sheet-options-modal").remove();
        let modal = $(`<div class="sheet-options-modal">
                        <div class="option sheet-rename">Rename</div>
                        <div class="option sheet-delete">Delete</div>
                    </div>`);
        $(".container").append(modal);
        $(".sheet-options-modal").css({ "bottom": 0.04 * $(".container").height(), "left": e.pageX });
        $(".sheet-rename").click(function (e) {
            let renameModal = `<div class="sheet-modal-parent">
                                <div class="sheet-rename-modal">
                                <div class="sheet-modal-title">
                                    <span>Rename Sheet</span>
                                </div>
                                <div class="sheet-modal-input-container">
                                    <span class="sheet-modal-input-title">Rename sheet to:</span>
                                    <input class="sheet-modal-input" type="text">
                                </div>
                                <div class="sheet-modal-confirmation">
                                    <div class="button ok-button">OK</div>
                                    <div class="button cancel-button">Cancel</div>
                                </div>
                                </div>
                            </div>`
            $(".container").append(renameModal);
            $(".cancel-button").click(function (e) {
                $(".sheet-modal-parent").remove();
            });
            $(".ok-button").click(function (e) {
                renameSheet();
            });
            $(".sheet-modal-input").keypress(function (e) {
                if (e.key == "Enter") {
                    renameSheet();
                }
            });
        });

        $(".sheet-delete").click(function (e) {
            let deleteModal = `<div class="sheet-modal-parent">
                                <div class="sheet-delete-modal">
                                <div class="sheet-modal-title">
                                    <span>Delete ${$(".sheet-tab.selected").text()}</span>
                                </div>
                                <div class="sheet-modal-detail-container">
                                    <span class="sheet-modal-detail-title">Deleted data cannot be restored...Are you sure to delete this sheet?</span>
                                </div>
                                <div class="sheet-modal-confirmation">
                                    <div class="button delete-button">
                                    <div class="material-icons delete-icon">delete_forever</div>
                                    Delete
                                    </div>
                                    <div class="button delete-cancel-button">Cancel</div>
                                </div>
                                </div>
                            </div>`

            $(".container").append(deleteModal);
            $(".delete-cancel-button").click(function (e) {
                $(".sheet-modal-parent").remove();
            });
            $(".delete-button").click(function (e) {
                if (totalSheets > 1) {
                    $(".sheet-modal-parent").remove();
                    let keysArray = Object.keys(cellData);
                    let selectedSheetIndex = keysArray.indexOf(selectedSheet);
                    let currentSelectedSheet = $(".sheet-tab.selected");
                    if (selectedSheetIndex == 0) {
                        selectSheet(currentSelectedSheet.next()[0]);
                    }
                    else {
                        selectSheet(currentSelectedSheet.prev()[0]);
                    }
                    delete cellData[currentSelectedSheet.text()];
                    currentSelectedSheet.remove();
                    totalSheets--;
                    saved = false;
                }
            });
        })

        if (!$(this).hasClass("selected")) {
            selectSheet(this);
        }
    });

    $(".sheet-tab.selected").click(function (e) {
        if (!$(this).hasClass("selected")) {
            selectSheet(this);
            $("#row-1-col-1").click();
        }
    });
}

function renameSheet() {
    let newSheetName = $(".sheet-modal-input").val();
    if (newSheetName && !Object.keys(cellData).includes(newSheetName)) {
        let newCellData = {};
        for (let i of Object.keys(cellData)) {
            if (i == selectedSheet) {
                newCellData[newSheetName] = cellData[i];
            }
            else {
                newCellData[i] = cellData[i];
            }

        }
        cellData = newCellData;
        selectedSheet = newSheetName;
        $(".sheet-tab.selected").text(newSheetName);
        $(".sheet-modal-parent").remove();
        saved = false;
    }
    else {
        $(".error").remove();
        $(".sheet-modal-input-container").append(`
        <div class="error">Sheet Name is not Valid or Sheet already exists! </div>
        `);
    }
}

$(".left-scroller").click(function (e) {
    let keysArray = Object.keys(cellData);
    let selectedSheetIndex = keysArray.indexOf(selectedSheet);
    if (selectedSheetIndex != 0) {
        selectSheet($(".sheet-tab.selected").prev()[0]);
    }
    $(".sheet-tab.selected")[0].scrollIntoView();
});

$(".right-scroller").click(function (e) {
    let keysArray = Object.keys(cellData);
    let selectedSheetIndex = keysArray.indexOf(selectedSheet);
    if (selectedSheetIndex != (keysArray.length - 1)) {
        selectSheet($(".sheet-tab.selected").next()[0]);
    }
    $(".sheet-tab.selected")[0].scrollIntoView();
});

$("#menu-file").click(function (e) {
    let fileModal = $(`<div class="file-modal">
                        <div class="file-options-modal">
                        <div class="close">
                            <div class="material-icons close-icon">arrow_circle_down</div>
                            <div>Close</div>
                        </div>
                        <div class="new">
                            <div class="material-icons new-icon">insert_drive_file</div>
                            <div>New</div>
                        </div>
                        <div class="open">
                            <div class="material-icons open-icon">folder_open</div>
                            <div>Open</div>
                        </div>
                        <div class="save">
                            <div class="material-icons save-icon">save</div>
                            <div>Save</div>
                        </div>
                    </div>
                    <div class="file-recent-modal"></div>
                    <div class="file-transparent-modal"></div>
                    </div>`);

    $(".container").append(fileModal);
    fileModal.animate({
        "width": "100vw"
    }, 300);

    $(".close, .file-transparent-modal, .new, .save, .open").click(function (e) {
        fileModal.animate({
            "width": "0vw"
        }, 300);
        setTimeout(() => {
            fileModal.remove();
        }, 299);
    });

    $(".new").click(function (e) {
        if (saved) {
            newFile();
        }
        else {
            $(".container").append(`<div class="sheet-modal-parent">
                                    <div class="sheet-delete-modal">
                                    <div class="sheet-modal-title">
                                        <span>${$(".title-bar").text()}</span>
                                    </div>
                                    <div class="sheet-modal-detail-container">
                                        <span class="sheet-modal-detail-title">Do you want to save changes?</span>
                                    </div>
                                    <div class="sheet-modal-confirmation">
                                        <div class="button ok-button">Save</div>
                                        <div class="button cancel-button">Cancel</div>
                                    </div>
                                    </div>
                                </div>`);
            $(".ok-button").click(function (e) {
                $(".sheet-modal-parent").remove();
                saveFile(true);
            });
            $(".cancel-button").click(function (e) {
                $(".sheet-modal-parent").remove();
                newFile();
            });
        }
    });

    $(".save").click(function (e) {
        saveFile();
    });


    $(".open").click(function (e) {
        openFile();
    });

});

function newFile() {
    emptySheet();
    $(".sheet-tab").remove();
    $(".sheet-tab-container").append(`<div class="sheet-tab selected">sheet1</div>`);
    cellData = { "sheet1": {} };
    selectedSheet = "sheet1";
    totalSheets = 1;
    lastlyAddedSheetNumber = 1;
    addSheetTabEventListeners();
    $("#row-1-col-1").click();
}

function saveFile(createNewFile) {
    if (!saved) {
        $(".container").append(`<div class="sheet-modal-parent">
                            <div class="sheet-rename-modal">
                            <div class="sheet-modal-title">
                                <span>Save File</span>
                            </div>
                            <div class="sheet-modal-input-container">
                                <span class="sheet-modal-input-title">File Name:</span>
                                <input class="sheet-modal-input" value="${$(".title-bar").text()}" type="text">
                            </div>
                            <div class="sheet-modal-confirmation">
                                <div class="button ok-button">Save</div>
                                <div class="button cancel-button">Cancel</div>
                            </div>
                            </div>
                        </div>`);
        $(".sheet-modal-input").focus();
        $(".ok-button").click(function (e) {
            saveFileOkButton(createNewFile);
        });

        $(".sheet-modal-input").keypress(function (e) {
            if (e.key == "Enter") {
                saveFileOkButton(createNewFile);
            }
        });

        $(".cancel-button").click(function (e) {
            $(".sheet-modal-parent").remove();
            if (createNewFile) {
                newFile();
            }
        });
    }
}

function saveFileOkButton(createNewFile) {
    let fileName = $(".sheet-modal-input").val();
    if (fileName) {
        let href = `data:application/json,${encodeURIComponent(JSON.stringify(cellData))}`;
        let a = $(`<a href=${href} download="${fileName}.json"></a>`)
        $(".container").append(a);
        a[0].click();
        a.remove();
        $(".sheet-modal-parent").remove();
        saved = true;
        if (createNewFile) {
            newFile();
        }
    }
}

function openFile() {
    let inputFile = $(`<input accept="application/json" type="file" />`);
    $(".container").append(inputFile);
    inputFile.click();
    inputFile.change(function (e) {
        let file = e.target.files[0];
        $(".title-bar").text(file.name.split(".json")[0]);
        let reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function () {
            emptySheet();
            $(".sheet-tab").remove();
            cellData = JSON.parse(reader.result);
            let sheets = Object.keys(cellData);
            for (let i of sheets) {
                $(".sheet-tab-container").append(`<div class="sheet-tab selected">${i}</div>`);
            }
            addSheetTabEventListeners();
            $(".sheet-tab").removeClass("selected");
            $($(".sheet-tab")[0]).addClass("selected");
            selectedSheet = sheets[0];
            totalSheets = sheets.length;
            lastlyAddedSheetNumber = totalSheets;
            loadSheet();
            inputFile.remove();
        };
    });
}

let clipBoard = { startCell: [], cellData: {} };
let contentCut = false;

$("#cut,#copy").click(function (e) {
    if ($(this).text() == "content_cut") {
        contentCut = true;
    }
    clipBoard.startCell = findRowCol($(".input-cell.selected")[0]);
    $(".input-cell.selected").each((index, data) => {
        let [rowId, colId] = findRowCol(data);
        if (cellData[selectedSheet][rowId - 1] && cellData[selectedSheet][rowId - 1][colId - 1]) {
            if (!clipBoard.cellData[rowId]) {
                clipBoard.cellData[rowId] = {};
            }
            clipBoard.cellData[rowId][colId] = { ...cellData[selectedSheet][rowId - 1][colId - 1] };
        }
    });
});

$("#paste").click(function (e) {
    if (contentCut) {
        emptySheet();
    }
    let startCell = findRowCol($(".input-cell.selected")[0]);
    let rows = Object.keys(clipBoard.cellData);
    for (let i of rows) {
        let cols = Object.keys(clipBoard.cellData[i]);
        for (let j of cols) {
            if (contentCut) {
                delete cellData[selectedSheet][i - 1][j - 1];
                if (Object.keys(cellData[selectedSheet][i - 1]).length == 0) {
                    delete cellData[selectedSheet][i - 1];
                }
            }
            let rowDistance = parseInt(i) - parseInt(clipBoard.startCell[0]);
            let colDistance = parseInt(j) - parseInt(clipBoard.startCell[1]);
            if (!cellData[selectedSheet][startCell[0] + rowDistance - 1]) {
                cellData[selectedSheet][startCell[0] + rowDistance - 1] = {};
            }
            cellData[selectedSheet][startCell[0] + rowDistance - 1][startCell[1] + colDistance - 1] = { ...clipBoard.cellData[i][j] };
        }
    }
    loadSheet();
    if (contentCut) {
        contentCut = false;
        clipBoard = { startCell: [], cellData: {} };
    }
});

$("#function-input").blur(function(e){
    if($(".input-cell.selected").length > 0){
        let formula = $(this).text();
        $(".input-cell.selected").each(function(index, data){
            let tempElements = formula.split(" ");
            let elements = [];
            for(let i of tempElements){
                if(i.length > 1){
                    i.replace("(", "");
                    i.replace(")", "");
                    elements.push(i);
                }
            }
            if(updateUpStreams(data, elements)){
                console.log(cellData);
            }
            else{
                alert("Oops!...Formula is invalid!");
            }
        });
    } 
    else{
        alert("Please select a cell to apply formula!");
    }
});

function updateUpStreams(ele, elements){
    let [rowId, colId] = findRowCol(ele);
    for(let i = 0; i < elements.length; i++) {
        if(checkForSelf(rowId,colId,elements[i])){
            return false;
        }
    }

    if (cellData[selectedSheet][rowId - 1] && cellData[selectedSheet][rowId - 1][colId - 1] && cellData[selectedSheet][rowId - 1][colId - 1].upStream.length > 0) {

        let upStream = cellData[selectedSheet][rowId - 1][colId - 1].upStream;
        console.log(upStream);
        let selfCode = calcColName(colId) + rowId;
        for (let i of upStream) {
            let [calRowId, calColId] = calcSelfValue(i);
            let index = cellData[selectedSheet][calRowId - 1][calColId - 1].downStream.indexOf(selfCode);
            cellData[selectedSheet][calRowId - 1][calColId - 1].downStream.splice(index, 1);
            if (JSON.stringify(cellData[selectedSheet][calRowId - 1][calColId - 1]) == JSON.stringify(defaultProperties)) {
                delete cellData[selectedSheet][calRowId - 1][calColId - 1];
                if (Object.keys(cellData[selectedSheet][calRowId - 1]).length == 0) {
                    delete cellData[selectedSheet][calRowId - 1];
                }
            }
        }
    }

    if(!cellData[selectedSheet][rowId - 1]){
        cellData[selectedSheet][rowId - 1] = {};
        cellData[selectedSheet][rowId - 1][colId - 1] = { ...defaultProperties, "upStream": [], "downStream": [] };
    }
    else if(!cellData[selectedSheet][rowId - 1][colId - 1]){
        cellData[selectedSheet][rowId - 1][colId - 1] = { ...defaultProperties, "upStream": [], "downStream": [] };
    }
    cellData[selectedSheet][rowId - 1][colId - 1].upStream = [];
    let data = cellData[selectedSheet][rowId - 1][colId - 1];
    for(let i = 0; i < elements.length; i++){
        if(data.downStream.includes(elements[i])){
            return false;
        }
        else{
            if(!data.upStream.includes(elements[i])){
                data.upStream.push(elements[i]);
            }
        }
    }
    return true;
}

function calcSelfValue(ele){
    let calRowId;
    let calColId;
    for(let i = 0; i < ele.length; i++){
        if(!isNaN(ele.charAt(i))){
            let leftString = ele.substring(0, i);
            let rightString = ele.substring(i);
            calColId = calcColId(leftString);
            calRowId = parseInt(rightString);
            break;
        }
    }
    return [calRowId, calColId];
}

function checkForSelf(rowId, colId, ele){
    let [calRowId, calColId] = calcSelfValue(ele);
    if(calRowId == rowId && calColId == colId){
        return true;
    }
    else{
        let selfName = calcColName(colId) + rowId;
        if (!cellData[selectedSheet][calRowId - 1]) {
            cellData[selectedSheet][calRowId - 1] = {};
            cellData[selectedSheet][calRowId - 1][calColId - 1] = { ...defaultProperties, "upStream": [], "downStream": [] };
        } else if (!cellData[selectedSheet][calRowId - 1][calColId - 1]) {
            cellData[selectedSheet][calRowId - 1][calColId - 1] = { ...defaultProperties, "upStream": [], "downStream": [] };
        }
        if(!cellData[selectedSheet][calRowId - 1][calColId - 1].downStream.includes(selfName)){
            cellData[selectedSheet][calRowId - 1][calColId - 1].downStream.push(selfName);
        }
        return false;
    }
}

function calcColId(str){
    let place = str.length - 1;
    let total = 0;
    for(let i = 0; i < str.length; i++){
        let charValue = str.charCodeAt(i) - 64;
        total += Math.pow(26, place) * charValue;
        place--;
    }
    return total;
}