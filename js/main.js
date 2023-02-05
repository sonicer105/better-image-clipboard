"use strict"

window.appState = {
    editing: false,
    data: {},
    targetIndex: 0,
    targetGroup: 'Uncategorized'
}

//#region Local Storage

function lpMaybeSaveToLocalStorage(){
    if(!!localStorage){
        localStorage.setItem('imageData', JSON.stringify(window.appState.data))
    }
    return false;
}

function lpMaybeReadFromLocalStorage(){
    if(!!localStorage){
        let rawData = localStorage.getItem('imageData');
        if(rawData !== null){
            window.appState.data = JSON.parse(rawData)
            return true;
        }
    }
    window.appState.data = {};
    return false;
}

//#endregion

//#region Add Image

function lpAddImage(){
    let urlEl = $('#url');
    let groupEl = $('#group');
    if(urlEl.val().length > 0) {
        if(groupEl.val().length === 0){
            groupEl.val('Uncategorized');
        }
        if(window.appState.data[groupEl.val()] === undefined){
            window.appState.data[groupEl.val()] = [];
        }
        window.appState.data[groupEl.val()].push(urlEl.val());
        urlEl.val('');
        lpMaybeSaveToLocalStorage();
        lpDrawImages();
        urlEl.focus();
        toastSuccess("Saved!")
    } else {
        toastError("URL can't be empty!")
    }
    return false;
}

//#endregion

//#region Render Images / Categories

function lpDrawImages(){
    let container = $('main');
    container.empty();
    if(!Object.keys(window.appState.data).length){ // No images to draw.
        container.append($('<section class="icon-group"><h2>No Icons Yet. Click <kbd>Edit</kbd> and add one.</h2></section>'));
        return;
    }
    container.append($('<p id="instructions-no-edit">Click on an image to copy it\'s URL to the clipboard.</p>'));
    container.append($('<p id="instructions-edit">Click on an image to edit it.</p>'));
    let index = 0;
    for (let keypair of Object.entries(window.appState.data)){
        let safeText = escapeHtml(keypair[0]);
        let section = $(`<section class="icon-group">
<h2><span class="cat-title">${safeText}</span>
<label><input type="text" class="rename-cat" id="rename-${index}"></label>
<span class="rename-cat-wrapper cat-controls">
    <a href="#"><span class="sr-only">Rename</span><i class="far fa-square-arrow-right fa-fw" aria-hidden="true"></i></a>
</span>
<span class="move-cat-up-wrapper cat-controls">
    <a href="#"><span class="sr-only">Move Forward</span><i class="far fa-square-caret-up fa-fw" aria-hidden="true"></i></a>
</span>
<span class="move-cat-down-wrapper cat-controls">
    <a href="#"><span class="sr-only">Move Backwards</span><i class="far fa-square-caret-down fa-fw" aria-hidden="true"></i></a>
</span>
</h2>
</section>`);
        section.find('a').data('target', keypair[0]);
        section.find('.rename-cat-wrapper a, input.rename-cat').val(keypair[0]).data('target', 'rename-' + index).data('old', keypair[0]);
        let images = $('<div class="icons"></div>')
        for (let img of Object.entries(keypair[1])){
            let imgEl = $(`<img src="${img[1]}" data-index="${img[0]}" data-group="${keypair[0]}" alt="An emote or sticker">`);
            imgEl.on('click', lpHandleImageClick);
            images.append(imgEl);
        }
        section.append(images);
        container.append(section);
        index++;
    }
    $("input.rename-cat").on("keypress", lpRenameCatKbd);
    $(".rename-cat-wrapper a").on("click", lpRenameCat);
    $(".move-cat-up-wrapper a").on("click", lpMoveCatUp);
    $(".move-cat-down-wrapper a").on("click", lpMoveCatDown);
    let groups = $('#group-list');
    groups.empty();
    for(let group of Object.keys(window.appState.data)){
        groups.append(`<option value="${group}">${group}</option>`);
    }
}

//#endregion

//#region Activate/Deactivate Editing

function lpOpenEditing(){
    window.appState.editing = true;
    $('.edit-tool').show();
    $('.non-edit-tool').hide();
    $(document.body).addClass('is-editing');
    return false;
}

function lpCloseEditing(){
    window.appState.editing = false;
    $('.edit-tool, .selection-tool').hide();
    $('.non-edit-tool, .non-selection-tool').show();
    $(document.body).removeClass('is-editing');
    return false;
}

//#endregion

//#region Active Image Handling

function lpHandleImageClick(e){
    let target = $(e.target);
    $('.icon-group img.active').removeClass('active');
    $(this).addClass('active');
    if(window.appState.editing){
        window.appState.targetIndex = target.data('index');
        window.appState.targetGroup = target.data('group');
        $('#edit-nav .img-preview img').attr('src', target.attr('src'))
        $('#move-cat').val(target.data('group'))
        $('.selection-tool').show();
        $('.non-selection-tool').hide();
        toastSuccess("Selected image for editing.");
    } else {
        navigator.clipboard.writeText(target.attr("src")).then(function (){
            toastSuccess("URL copied to Clipboard!");
        }, function (){
            toastError("Failed to copy to clipboard. Permission error?");
        });
    }
    return false;
}

function lpDeleteActiveImage() {
    window.appState.data[window.appState.targetGroup].splice(window.appState.targetIndex, 1);
    if(Object.keys(window.appState.data[window.appState.targetGroup]).length === 0){
        delete window.appState.data[window.appState.targetGroup];
    }
    window.appState.targetGroup = 'Uncategorized';
    window.appState.targetIndex = 0;
    $('.selection-tool').hide();
    $('.non-selection-tool').show();
    lpMaybeSaveToLocalStorage();
    lpDrawImages();
    toastSuccess("Item was deleted!");
    return false;
}

function lpMoveToGroup() {
    let newGroup = $('#move-cat').val();
    if(newGroup.length === 0) return false;
    let element = window.appState.data[window.appState.targetGroup].splice(window.appState.targetIndex, 1);
    if(window.appState.data[newGroup] === undefined){
        window.appState.data[newGroup] = [];
    }
    if(Object.keys(window.appState.data[window.appState.targetGroup]).length === 0){
        delete window.appState.data[window.appState.targetGroup];
    }
    window.appState.data[newGroup].push(element[0]);
    window.appState.targetGroup = newGroup;
    window.appState.targetIndex = window.appState.data[newGroup].length - 1;
    lpMaybeSaveToLocalStorage();
    lpDrawImages();
    return false;
}

function lpMoveUp(){
    let newIndex = window.appState.targetIndex - 1;
    if(lpArrayIndexMove(window.appState.data[window.appState.targetGroup],window.appState.targetIndex,newIndex)){
        window.appState.targetIndex = newIndex;
        lpMaybeSaveToLocalStorage();
        lpDrawImages();
    }
    return false;
}

function lpMoveDown(){
    let newIndex = window.appState.targetIndex + 1;
    if(lpArrayIndexMove(window.appState.data[window.appState.targetGroup],window.appState.targetIndex,newIndex)){
        window.appState.targetIndex = newIndex;
        lpMaybeSaveToLocalStorage();
        lpDrawImages();
    }
    return false;
}

//#endregion

//#region Category Editing

function lpRenameCatKbd(e) {
    if(e.key === "Enter") {
        e.preventDefault();
        (lpRenameCat.bind(this))()
    }
}

function lpRenameCat() {
    let newCatName = $("#" + $(this).data('target')).val();
    let oldCatName = $(this).data('old');
    if(newCatName === oldCatName) return false;
    let dataKeys = Object.keys(window.appState.data);
    let targetIndex = dataKeys.indexOf(oldCatName);
    dataKeys[targetIndex] = newCatName;
    window.appState.data[newCatName] = window.appState.data[oldCatName];
    delete window.appState.data[oldCatName];
    lpSetNewOrder(dataKeys);
    toastSuccess("Category renamed successfully!")
    return false;
}

function lpMoveCatDown() {
    let target = $(this).data('target');
    if(!target) return false;
    let dataKeys = Object.keys(window.appState.data);
    let targetIndex = dataKeys.indexOf(target);
    if(targetIndex < 0) return false;
    lpArrayIndexMove(dataKeys, targetIndex, targetIndex + 1);
    lpSetNewOrder(dataKeys);
    return false;
}

function lpMoveCatUp() {
    let target = $(this).data('target');
    if(!target) return false;
    let dataKeys = Object.keys(window.appState.data);
    let targetIndex = dataKeys.indexOf(target);
    if(targetIndex < 0) return false;
    lpArrayIndexMove(dataKeys, targetIndex, targetIndex - 1);
    lpSetNewOrder(dataKeys);
    return false;
}

function lpSetNewOrder(orderKeys) {
    let newData = {};
    for(let i in orderKeys) {
        if(orderKeys.hasOwnProperty(i)) {
            newData[orderKeys[i]] = window.appState.data[orderKeys[i]];
        }
    }
    window.appState.data = newData;
    lpMaybeSaveToLocalStorage();
    lpDrawImages();
}

//#endregion

//#region Array Tools

function lpArrayIndexMove(arr, old_index, new_index) {
    if (old_index < 0 || new_index < 0) return false;
    if (new_index >= arr.length) return false;
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return true;
}

//endregion

//#region Menus

function lpShowOptionsMenu(){
    $('#options-model').addClass('active');
    return false;
}

function lpHideOptionsMenu(){
    $('#options-model').removeClass('active');
    return false;
}

function lpShowBackupMenu(){
    $('#options-model').removeClass('active');
    $('#backup-model').addClass('active');
    return false;
}

function lpHideBackupMenu(){
    $('#backup-model').removeClass('active');
    $('#options-model').addClass('active');
    return false;
}

//#endregion

//#region Backups

function lpExportData(e){
    let targetType = $(e.target).data('target') ?? 'file';
    if(targetType === 'file') {
        $(e.target)
            .attr("href", `data:text/json;charset=utf-8,${btoa(JSON.stringify(LZW.compress(JSON.stringify(window.appState.data))))}`)
            .attr('download', 'backup.lzw.b64')
        toastSuccess("LZW items exported!");
    } else if (targetType === 'file-legacy') {
        $(e.target)
            .attr("href", `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(window.appState.data))}`)
            .attr('download', 'backup.json')
        toastSuccess("JSON items exported!");
    } else if (targetType === 'copy') {
        navigator.clipboard.writeText(btoa(JSON.stringify(LZW.compress(JSON.stringify(window.appState.data))))).then(function (){
            toastSuccess("LZW export copied to clipboard!");
        }, function (){
            toastError("Failed to export to clipboard. Permission error?");
        });
        return false;
    } else if (targetType === 'copy-legacy') {
        navigator.clipboard.writeText(JSON.stringify(window.appState.data)).then(function (){
            toastSuccess("JSON export copied to clipboard!");
        }, function (){
            toastError("Failed to export to clipboard. Permission error?");
        });
        return false;
    }
    return true;
}

function lpOpenImportFile(){
    let file = $('#file-import').prop('files')[0];
    if(file !== undefined){
        let fr = new FileReader();
        fr.onload = function () {
            try {
                lpImportData(JSON.parse(fr.result))
                toastSuccess("JSON items imported!");
            } catch (e) {
                let temp = atob(fr.result);
                if(temp.indexOf('[') < 0) temp = '[' + temp + ']';
                lpImportData(JSON.parse(LZW.decompress(JSON.parse(temp))));
                toastSuccess("LZW Items imported!");
            }
        }
        fr.readAsText(file);
    }
    return false;
}

function lpParseImportField(){
    let fieldVal = $("#import-field").val()
    try {
        lpImportData(JSON.parse(fieldVal))
        toastSuccess("JSON items imported!");
    } catch (e) {
        let temp = atob(fieldVal);
        if(temp.indexOf('[') < 0) temp = '[' + temp + ']';
        lpImportData(JSON.parse(LZW.decompress(JSON.parse(temp))))
        toastSuccess("LZW Items imported!");
    }
    return false;
}

function lpImportData(jsonData){
    window.appState.data = Object.assign(window.appState.data, jsonData);
    window.appState.targetGroup = 'Uncategorized';
    window.appState.targetIndex = 0;
    $('.selection-tool').hide();
    $('.non-selection-tool').show();
    lpMaybeSaveToLocalStorage();
    lpDrawImages();
    $('#file-import').val(null);
}

//#endregion

//#region Delete All

function lpDeleteAll() {
    localStorage.removeItem('imageData');
    window.appState.targetGroup = 'Uncategorized';
    window.appState.targetIndex = 0;
    $('.selection-tool').hide();
    $('.non-selection-tool').show();
    lpMaybeReadFromLocalStorage();
    lpDrawImages();
    toastSuccess("All items deleted!");
    return false;
}

//#endregion

//#region Dedupe

function lpDedupe() {
    toastError("Not Yet Implemented! SORRY!");
    return false;
}

//#endregion

//#region Toasts

var toastTimeout = null;

function toastError(text) {
    $("#toast-model .message").text(text);
    $("#toast-model svg.ok").hide();
    $("#toast-model svg.error").show();
    $("#toast-model").addClass('error active');
    if(toastTimeout !== null) {
        clearTimeout(toastTimeout);
    }
    setTimeout(resetToast, 5000);
}

function toastSuccess(text) {
    $("#toast-model .message").text(text);
    $("#toast-model svg.ok").show();
    $("#toast-model svg.error").hide();
    $("#toast-model").removeClass('error').addClass('active');
    if(toastTimeout !== null) {
        clearTimeout(toastTimeout);
    }
    setTimeout(resetToast, 5000);
}

function resetToast() {
    $("#toast-model").removeClass('active');
}

//#endregion

//#region Init

lpMaybeReadFromLocalStorage();

jQuery(function ($){
    $('.edit-wrapper a').on('click', lpOpenEditing);
    $('.save-wrapper a').on('click', lpCloseEditing);
    $('#url, #group').on("keypress", function(e) {
        if (e.keyCode === 13) {
            return lpAddImage();
        }
    });
    $('.create-wrapper a').on('click', lpAddImage);
    $('.move-up-wrapper a').on('click', lpMoveUp);
    $('.move-down-wrapper a').on('click', lpMoveDown);
    $('#move-cat').on("keypress", function(e) {
        if (e.keyCode === 13) {
            e.target.blur();
            return lpMoveToGroup();
        }
    });
    $('.move-cat-button-wrapper a').on('click', lpMoveToGroup);
    $('.delete-wrapper a').on('click', lpDeleteActiveImage);
    $('.options-wrapper a').on('click', lpShowOptionsMenu);
    $('#options-model').on('click', lpHideOptionsMenu);
    $('#options-model .dialogue').on('click', function (e){ e.stopPropagation() });
    $('#backup-model').on('click', lpHideBackupMenu);
    $('#backup-model .dialogue').on('click', function (e){ e.stopPropagation() });
    $('#backup').on('click', lpShowBackupMenu);
    $('#close-back').on('click', lpHideBackupMenu);
    $('.button.export').on('click', lpExportData);
    $('#import-file').on('click', lpOpenImportFile);
    $('#import-text').on('click', lpParseImportField);
    $('#dedupe').on('click', lpDedupe);
    $('#delete-all').on('click', lpDeleteAll);
    $('#search').on("keypress", function(e) {
        if (e.keyCode === 13) {
            toastError("Search isn't implemented yet! SORRY!");
            return false;
        }
    });
    lpDrawImages();
})

//#endregion

//#region Escape HTML

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

//#endregion

//#region LZW Compression

//LZW Compression/Decompression for Strings
//SOURCE: https://rosettacode.org/wiki/LZW_compression#JavaScript
var LZW = {
    /**
     * @param {string} uncompressed
     */
    compress: function (uncompressed) {
        "use strict";
        // Build the dictionary.
        var i,
            dictionary = {},
            c,
            wc,
            w = "",
            result = [],
            dictSize = 256;
        for (i = 0; i < 256; i += 1) {
            dictionary[String.fromCharCode(i)] = i;
        }

        for (i = 0; i < uncompressed.length; i += 1) {
            c = uncompressed.charAt(i);
            wc = w + c;
            //Do not use dictionary[wc] because javascript arrays
            //will return values for array['pop'], array['push'] etc
            // if (dictionary[wc]) {
            if (dictionary.hasOwnProperty(wc)) {
                w = wc;
            } else {
                result.push(dictionary[w]);
                // Add wc to the dictionary.
                dictionary[wc] = dictSize++;
                w = String(c);
            }
        }

        // Output the code for w.
        if (w !== "") {
            result.push(dictionary[w]);
        }
        return result;
    },

    /**
     * @param {string} compressed
     */
    decompress: function (compressed) {
        "use strict";
        // Build the dictionary.
        var i,
            dictionary = [],
            w,
            result,
            k,
            entry = "",
            dictSize = 256;
        for (i = 0; i < 256; i += 1) {
            dictionary[i] = String.fromCharCode(i);
        }

        w = String.fromCharCode(compressed[0]);
        result = w;
        for (i = 1; i < compressed.length; i += 1) {
            k = compressed[i];
            if (dictionary[k]) {
                entry = dictionary[k];
            } else {
                if (k === dictSize) {
                    entry = w + w.charAt(0);
                } else {
                    return null;
                }
            }

            result += entry;

            // Add w+entry[0] to the dictionary.
            dictionary[dictSize++] = w + entry.charAt(0);

            w = entry;
        }
        return result;
    }
}

//#endregion