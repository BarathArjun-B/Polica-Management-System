require('dotenv').config();
const mongoose = require('mongoose');

const resetDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is undefined in .env');
        }

        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected.');

        console.log('⚠️  Dropping Database...');
        await mongoose.connection.db.dropDatabase();
        console.log('💥 Database successfully reset. All data purged.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Reset Failed:', err);
        process.exit(1);
    }
};

resetDB();
