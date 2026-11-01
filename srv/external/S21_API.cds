namespace srv.external;

// This is a placeholder mock for your S21 ERP API structure.
// In production, you would run: `cds import API_PURCHASEORDER_PROCESS_SRV.edmx` 
// and it would automatically generate this file.

service S21_API {
    entity A_PurchaseOrder {
        key PurchaseOrder : String(10);
        Supplier : String(10);
        TargetQuantity: Decimal(13, 3);
        NetAmount : Decimal(15, 2);
        CreationDate : Date;
    }
}
