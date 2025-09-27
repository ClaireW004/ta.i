const { Storage } = require('@google-cloud/storage')

async function testBucket() {
  try {
    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    })
    
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET
    const bucket = storage.bucket(bucketName)
    
    console.log(`Testing bucket: ${bucketName}`)
    
    const [exists] = await bucket.exists()
    console.log(`Bucket exists: ${exists}`)
    
    if (exists) {
      // Try to create a test file
      const file = bucket.file('test.txt')
      await file.save('test content')
      console.log('✅ Successfully uploaded test file')
      
      // Clean up
      await file.delete()
      console.log('✅ Successfully deleted test file')
    }
    
  } catch (error) {
    console.error('❌ Bucket test failed:', error.message)
  }
}

testBucket()