# 🗑️ Database Cleanup Guide for Pujo_media

This guide will help you clear all test data from your Pujo_media application before deployment.

## 📋 What Will Be Deleted

The cleanup process will remove:

- ✅ **All photos** from Firestore database
- ✅ **All user profiles** and data
- ✅ **All comments** and likes
- ✅ **All engagement data** (shares, interactions)
- ✅ **All uploaded files** from local storage
- ✅ **All files** from Firebase Storage bucket
- ✅ **Profile pictures** and media files

## 🚀 How to Clear Your Database

### Option 1: Interactive Cleanup (Recommended)

This method asks for confirmation before deleting anything:

```bash
# Navigate to backend directory
cd backend

# Run the interactive cleanup script
npm run clear-db
```

The script will:
1. Show you exactly what will be deleted
2. Ask for confirmation (type "YES" to proceed)
3. Delete all data step by step
4. Show you a summary of what was deleted

### Option 2: Quick Cleanup (Advanced Users)

This method deletes everything immediately without asking:

```bash
# Navigate to backend directory
cd backend

# Run the quick cleanup script
npm run quick-clear
```

⚠️ **Warning**: This deletes everything immediately without confirmation!

### Option 3: Manual Script Execution

You can also run the scripts directly:

```bash
# Interactive cleanup
node scripts/clear-database.js

# Quick cleanup
node scripts/quick-clear.js
```

## 🔍 What Happens During Cleanup

### Step 1: Firestore Collections
The script will clear these collections:
- `photos` - All photo metadata and information
- `users` - All user profiles and data
- `comments` - All comments on photos
- `likes` - All like interactions
- `shares` - All share interactions

### Step 2: Firebase Storage
- Deletes all uploaded images from Firebase Storage bucket
- Removes all profile pictures and photo files

### Step 3: Local Files
- Clears `backend/uploads/profiles/` directory
- Removes any other uploaded files in the uploads folder

## 📊 Expected Output

After running the cleanup, you should see something like:

```
🚀 Starting Pujo_media Database Cleanup
=====================================

🗑️  Clearing collection: photos
   ✅ Deleted 15 documents from photos

🗑️  Clearing collection: users
   ✅ Deleted 3 documents from users

🗑️  Clearing Firebase Storage
   ✅ Deleted 18 files from Firebase Storage

🗑️  Clearing local uploads directory
   ✅ Deleted 8 local files

=====================================
✅ CLEANUP COMPLETED SUCCESSFULLY!
📊 Total items deleted: 44
🚀 Your database is now clean and ready for deployment!
=====================================
```

## 🛡️ Safety Measures

### Before Running Cleanup:
1. **Backup Important Data**: If you have any data you want to keep, export it first
2. **Test Environment**: Make sure you're running this on your test/development environment
3. **Environment Variables**: Verify your `.env` file points to the correct Firebase project

### After Running Cleanup:
1. **Verify Empty Database**: Check your Firebase Console to confirm data is deleted
2. **Test Application**: Run your app to make sure it works with an empty database
3. **Deploy**: Your app is now ready for production deployment

## 🔧 Troubleshooting

### Permission Errors
If you get permission errors:
```bash
# Make sure the script is executable (Linux/Mac)
chmod +x scripts/clear-database.js

# Or run with node directly
node scripts/clear-database.js
```

### Firebase Connection Issues
If you get Firebase connection errors:
1. Check your `.env` file has all required Firebase credentials
2. Verify your Firebase service account has proper permissions
3. Make sure your Firebase project is active

### File Permission Issues
If you can't delete local files:
1. Make sure no processes are using the files
2. Check file permissions in the uploads directory
3. Run the script as administrator if needed (Windows)

## 📝 Manual Verification

After cleanup, you can manually verify the cleanup was successful:

### Check Firestore (Firebase Console):
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Firestore Database
4. Verify all collections are empty

### Check Firebase Storage:
1. In Firebase Console, go to Storage
2. Verify the storage bucket is empty

### Check Local Files:
```bash
# Check if uploads directory is empty
ls -la backend/uploads/profiles/
```

## 🚀 Ready for Deployment

Once cleanup is complete, your Pujo_media application is ready for production deployment with:
- ✅ Clean database
- ✅ No test data
- ✅ Fresh start for real users
- ✅ Optimized for production

## 📞 Need Help?

If you encounter any issues during cleanup:
1. Check the error messages in the console
2. Verify your Firebase credentials and permissions
3. Make sure all required dependencies are installed
4. Try running the script with `node` directly instead of `npm run`

---

**Happy Deploying! 🎉**
