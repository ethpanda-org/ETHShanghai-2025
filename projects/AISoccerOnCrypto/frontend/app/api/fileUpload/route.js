import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    const ipfsHash = await uploadToIPFS(formData);

    return NextResponse.json({ipfsHash});

  } catch (error) {
    console.error('Upload file to ipfs error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file to ipfs' },
      { status: 500 }
    );
  }
}

const uploadToIPFS = async (formData) => {
  try {
    // 使用公共IPFS网关进行上传 (实际项目中可能需要使用私有IPFS节点)
    const response = await fetch('https://moccasin-adverse-takin-944.mypinata.cloud', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
      },
      body: formData
    })

    if (!response.ok) {
      // 如果Pinata失败，使用模拟的IPFS上传
      console.warn('Pinata upload failed, using mock IPFS')
      throw new Error('IPFS upload failed');
    }

    const result = await response.json()
    return result.IpfsHash
  } catch (error) {
    console.error('IPFS upload error:', error)
    // 生成模拟的IPFS哈希
    throw new Error('IPFS upload failed');
  }
}
