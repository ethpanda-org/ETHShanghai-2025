import { NextResponse } from 'next/server';
import { PinataSDK } from "pinata";

const NEXT_PUBLIC_PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmMzYzOTVkZC0xY2YzLTQ5NTUtODVmZS1kMzM5MGU2ZDU4YzEiLCJlbWFpbCI6InNhbXVhbDRjcnlwdG9AZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImFiMmJlN2IyMTc1NGM3OGU3YzRjIiwic2NvcGVkS2V5U2VjcmV0IjoiMGM3MzVhNzY5ZWYzMzcxZTdiYTE4MjZhODFjZWJmYzIwMzUyMDAzMDJmMzUxYzgyODM2Y2VlYTg1MWFmN2MxNSIsImV4cCI6MTc5MjQ4NTMxMH0.pZYUFKY0T6sYl9b3bVSQylA5NO9samdfF4CjugMeHtM"

const pinata = new PinataSDK({
  pinataJwt: NEXT_PUBLIC_PINATA_JWT,
  pinataGateway: "moccasin-adverse-takin-944.mypinata.cloud",
});

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
    
    // 检查并重新构建 FormData（确保字段名为 "file"）
    const file = formData.get('file') // 或者您使用的字段名
    if (!file) {
      throw new Error('No file found in form data')
    }
    // Convert file to File object if it's not already
    const fileObject = file instanceof File ? file : new File([file], file.name || 'uploaded-file', {
      type: file.type || 'application/octet-stream'
    });
    const upload = await pinata.upload.public.file(fileObject);
    console.log('upload', upload);


    // // 重新构建 FormData 确保格式正确
    // const pinataFormData = new FormData()
    // pinataFormData.append('file', file)
    
    // // 可选：添加 pinata metadata
    // const metadata = JSON.stringify({
    //   name: file.name || 'agent-file',
    // })
    // pinataFormData.append('pinataMetadata', metadata)

    // // 使用公共IPFS网关进行上传 (实际项目中可能需要使用私有IPFS节点)
    // const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${NEXT_PUBLIC_PINATA_JWT}`,
    //   },
    //   body: formData
    // })
    // if (!response.ok) {
    //   // 如果Pinata失败，使用模拟的IPFS上传
    //   console.warn('Pinata upload failed, using mock IPFS', response.status, response.statusText)
    //   throw new Error('IPFS upload failed');
    // }

    // const result = await response.json()
    return '1'
  } catch (error) {
    console.error('error:', error)
    // 生成模拟的IPFS哈希
    throw new Error('IPFS upload failed');
  }
}
