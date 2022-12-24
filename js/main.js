window.appState = {
    editing: false,
    data: {},
    targetIndex: 0,
    targetGroup: 'Uncategorized'
}

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

function lpDrawImages(){
    let container = $('main');
    container.empty();
    if(!Object.keys(window.appState.data).length){ // No images to draw.
        container.append($('<section class="icon-group"><h2>No Icons Yet. Click <kbd>Edit</kbd> and add one.</h2></section>'));
        return;
    }
    for (let keypair of Object.entries(window.appState.data)){
        let section = $(`<section class="icon-group"><h2>${keypair[0]}</h2></section>`);
        let images = $('<div class="icons"></div>')
        for (let img of Object.entries(keypair[1])){
            let imgEl = $(`<img src="${img[1]}" data-index="${img[0]}" data-group="${keypair[0]}">`);
            imgEl.on('click', lpHandleImageClick);
            images.append(imgEl);
        }
        section.append(images);
        container.append(section);
    }
    let groups = $('#group-list')
    groups.empty();
    for(let group of Object.keys(window.appState.data)){
        groups.append(`<option value="${group}">${group}</option>`);
    }
}

function lpOpenEditing(){
    window.appState.editing = true;
    $('.edit-tool').show();
    $('.non-edit-tool').hide();
    return false;
}

function lpCloseEditing(){
    window.appState.editing = false;
    $('.edit-tool, .selection-tool').hide();
    $('.non-edit-tool, .non-selection-tool').show();
    return false;
}

function lpHandleImageClick(e){
    let target = $(e.target);
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

function lpArrayIndexMove(arr, old_index, new_index) {
    if (old_index < 0 || new_index < 0) return false;
    if (new_index >= arr.length) return false;
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return true;
}

function lpShowOptionsMenu(){
    $('#options-model').addClass('active');
    return false;
}

function lpHideOptionsMenu(){
    $('#options-model').removeClass('active');
    return false;
}

function lpExportData(e){
    $(e.target)
        .attr("href", `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(window.appState.data))}`)
        .attr('download', 'backup.json')
    toastSuccess("Items exported!");
}

function lpImportData(){
    let file = $('#file-import').prop('files')[0];
    if(file !== undefined){
        let fr = new FileReader();
        fr.onload = function () {
            window.appState.data = Object.assign(window.appState.data, JSON.parse(fr.result));
            window.appState.targetGroup = 'Uncategorized';
            window.appState.targetIndex = 0;
            $('.selection-tool').hide();
            $('.non-selection-tool').show();
            lpMaybeSaveToLocalStorage();
            lpDrawImages();
            $('#file-import').val(null);
            toastSuccess("Items imported!");
        }
        fr.readAsText(file);
    }
    return false;
}

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

function lpDedupe() {
    toastError("Not Yet Implemented! SORRY!");
    return false;
}

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
    $('#export').on('click', lpExportData);
    $('#import').on('click', lpImportData);
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