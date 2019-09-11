const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const AuditEventSchema = new Schema({
	systemId: { type: String, required: true },
	deviceName : String,
	event : { type: String, required: true },
	kvmSessionTimeHrs : String,
	kvmSessionTimeMs : Number,
	user: String,
	time: { type: Date, required: true }
});

AuditEventSchema.index({
	systemId: 1,
	time: 1,
	event: 1
}, {
	unique: true,
	background: false
});

module.exports = mongoose.model('AuditEvent', AuditEventSchema);