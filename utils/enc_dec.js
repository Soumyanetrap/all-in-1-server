const crypto = require('crypto');

// Encryption function
const encrypt = (text, key, iv = null) => {
    if(!iv)
        iv = crypto.randomBytes(16); // Initialization vector
    else
        iv = Buffer.from(iv, 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { iv: iv.toString('hex'), encryptedData: encrypted };
};

// Decryption function
const decrypt = (encryptedData, key, iv) => {
    const ivBuffer = Buffer.from(iv, 'hex');
    
    const encryptedText = Buffer.from(encryptedData, 'hex');
    
    // Check lengths
    if (key.length !== 32) {
        logger.log("Invalid key length. Expected 32 bytes for AES-256.");
        return null;
    }
    
    if (ivBuffer.length !== 16) {
        logger.log("Invalid IV length. Expected 16 bytes for AES.");
        return null;
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
    
    try {
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        logger.log("Decryption failed:", error);
        return null;
    }
};


module.exports = {encrypt, decrypt}