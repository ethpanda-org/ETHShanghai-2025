import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'

// StreamPayment ABI (simplified for key functions)
const STREAM_PAYMENT_ABI = [
  "function registerSupplier(string memory _name, string memory _brand, string memory _category, uint16 _profitMargin) external",
  "function createPayment(address _to, string memory _category) external payable",
  "function getSupplier(address _supplierAddress) external view returns (tuple(address supplierAddress, string name, string brand, string category, uint16 profitMargin, uint256 totalReceived, bool isActive))",
  "function getSuppliers() external view returns (address[] memory)",
  "function getPayments() external view returns (tuple(uint256 paymentId, address from, address to, uint256 amount, string category, uint8 status, uint256 timestamp)[] memory)",
  "function getPaymentStatistics() external view returns (uint256 totalPayments, uint256 totalAmount, uint256 supplierCount, uint256 averagePayment)",
  "event SupplierRegistered(address indexed supplier, string name, string brand)",
  "event PaymentCreated(uint256 indexed paymentId, address indexed from, address indexed to, uint256 amount, string category)"
]

export function useStreamPaymentContract(signer, contractAddress) {
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Initialize contract
  useEffect(() => {
    if (signer && contractAddress) {
      try {
        const contractInstance = new ethers.Contract(
          contractAddress,
          STREAM_PAYMENT_ABI,
          signer
        )
        setContract(contractInstance)
      } catch (err) {
        console.error('Error initializing contract:', err)
        setError(err.message)
      }
    }
  }, [signer, contractAddress])

  // Register supplier
  const registerSupplier = useCallback(async (name, brand, category, profitMargin) => {
    if (!contract) {
      setError('Contract not initialized')
      return null
    }

    try {
      setLoading(true)
      setError(null)

      const tx = await contract.registerSupplier(name, brand, category, profitMargin)
      console.log('Transaction sent:', tx.hash)

      const receipt = await tx.wait()
      console.log('Transaction confirmed:', receipt)

      return receipt
    } catch (err) {
      console.error('Error registering supplier:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [contract])

  // Create payment
  const createPayment = useCallback(async (toAddress, category, amountInEth) => {
    if (!contract) {
      setError('Contract not initialized')
      return null
    }

    try {
      setLoading(true)
      setError(null)

      const amount = ethers.parseEther(amountInEth.toString())
      const tx = await contract.createPayment(toAddress, category, { value: amount })
      console.log('Payment transaction sent:', tx.hash)

      const receipt = await tx.wait()
      console.log('Payment confirmed:', receipt)

      return receipt
    } catch (err) {
      console.error('Error creating payment:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [contract])

  // Get supplier info
  const getSupplier = useCallback(async (supplierAddress) => {
    if (!contract) return null

    try {
      const supplier = await contract.getSupplier(supplierAddress)
      return {
        address: supplier.supplierAddress,
        name: supplier.name,
        brand: supplier.brand,
        category: supplier.category,
        profitMargin: Number(supplier.profitMargin) / 100, // Convert basis points to percentage
        totalReceived: ethers.formatEther(supplier.totalReceived),
        isActive: supplier.isActive
      }
    } catch (err) {
      console.error('Error getting supplier:', err)
      return null
    }
  }, [contract])

  // Get all suppliers
  const getSuppliers = useCallback(async () => {
    if (!contract) return []

    try {
      setLoading(true)
      const addresses = await contract.getSuppliers()
      
      // Fetch details for each supplier
      const suppliers = await Promise.all(
        addresses.map(async (address) => {
          const supplier = await getSupplier(address)
          return supplier
        })
      )

      return suppliers.filter(s => s !== null)
    } catch (err) {
      console.error('Error getting suppliers:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [contract, getSupplier])

  // Get all payments
  const getPayments = useCallback(async () => {
    if (!contract) return []

    try {
      setLoading(true)
      const payments = await contract.getPayments()
      
      return payments.map(p => ({
        paymentId: Number(p.paymentId),
        from: p.from,
        to: p.to,
        amount: ethers.formatEther(p.amount),
        category: p.category,
        status: ['Pending', 'Completed', 'Failed'][Number(p.status)],
        timestamp: new Date(Number(p.timestamp) * 1000).toISOString()
      }))
    } catch (err) {
      console.error('Error getting payments:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [contract])

  // Get payment statistics
  const getStatistics = useCallback(async () => {
    if (!contract) return null

    try {
      const stats = await contract.getPaymentStatistics()
      
      return {
        totalPayments: Number(stats.totalPayments),
        totalAmount: ethers.formatEther(stats.totalAmount),
        supplierCount: Number(stats.supplierCount),
        averagePayment: ethers.formatEther(stats.averagePayment)
      }
    } catch (err) {
      console.error('Error getting statistics:', err)
      setError(err.message)
      return null
    }
  }, [contract])

  // Listen for events
  const listenToEvents = useCallback((onSupplierRegistered, onPaymentCreated) => {
    if (!contract) return () => {}

    const supplierFilter = contract.filters.SupplierRegistered()
    const paymentFilter = contract.filters.PaymentCreated()

    contract.on(supplierFilter, (supplier, name, brand, event) => {
      console.log('Supplier registered:', { supplier, name, brand })
      if (onSupplierRegistered) onSupplierRegistered({ supplier, name, brand, event })
    })

    contract.on(paymentFilter, (paymentId, from, to, amount, category, event) => {
      console.log('Payment created:', { paymentId, from, to, amount, category })
      if (onPaymentCreated) onPaymentCreated({ paymentId, from, to, amount, category, event })
    })

    // Cleanup function
    return () => {
      contract.off(supplierFilter)
      contract.off(paymentFilter)
    }
  }, [contract])

  return {
    contract,
    loading,
    error,
    registerSupplier,
    createPayment,
    getSupplier,
    getSuppliers,
    getPayments,
    getStatistics,
    listenToEvents
  }
}

