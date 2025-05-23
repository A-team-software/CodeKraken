
const obj = {
    value: this.value || [],
    updateValue: function updateValue() {
        logger(this.value);
    },
}

const logger = (val) => {
    val.push('test');
    console.log(val);
}
const res = obj.updateValue();

