-- CreateTable
CREATE TABLE "customer_assignees" (
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_assignees_pkey" PRIMARY KEY ("customerId","userId")
);

-- AddForeignKey
ALTER TABLE "customer_assignees" ADD CONSTRAINT "customer_assignees_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_assignees" ADD CONSTRAINT "customer_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
