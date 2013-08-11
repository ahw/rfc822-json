function HeaderToken(options) {
    this.type = (options && options.type) ? options.type : null;
    this.value = (options && options.value) ? options.value : "";
}

module.exports = HeaderToken;
