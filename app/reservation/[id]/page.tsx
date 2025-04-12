"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// 定义预约数据类型
type ReservationData = {
	user: string;
	timeslot: string;
	contact: string;
	reservationId: string;
	date: string;
};

export default function ReservationDetail() {
	const params = useParams();
	const router = useRouter();
	const reservationId = params.id as string;
	const [reservation, setReservation] =
		useState<ReservationData | null>(null);
	const [loading, setLoading] = useState(true);
	const [openDialog, setOpenDialog] = useState(false);

	useEffect(() => {
		const fetchReservation = async () => {
			setLoading(true);

			try {
				const res = await fetch(
					`/api/getSingleReservation?reservationid=${reservationId}`
				);
				if (!res.ok) {
					throw new Error("Failed to fetch reservation");
				}

				const data = await res.json();

				const formattedData: ReservationData = {
					user: data.name,
					timeslot: data.timeSlot,
					contact: data.email ?? "",
					reservationId: data.reservationId,
					date: data.date.split("T")[0],
				};

				setReservation(formattedData);
			} catch (error) {
				console.error(error);
				setReservation(null);
			} finally {
				setLoading(false);
			}
		};

		if (reservationId) {
			fetchReservation();
		}
	}, [reservationId]);

	const handleDelete = async () => {
		try {
			const res = await fetch(
				`/api/getSingleReservation?reservationid=${reservationId}`,
				{
					method: "POST",
				}
			);

			if (!res.ok) {
				throw new Error("删除失败");
			}

			const data = await res.json();

			if (data.success) {
				// 成功后跳回首页或日历页
				toast.success(`成功取消预约`, {
					position: "top-center",
					duration: 3000,
				});
				router.push("/");
			} else {
				toast.error(`删除失败`, {
					position: "top-center",
					duration: 3000,
				});
				setTimeout(() => {
					window.location.reload();
				}, 3000);
			}
		} catch (error) {
			console.error(error);
			toast.error(`删除失败，请待会重试`, {
				position: "top-center",
				duration: 3000,
			});
			// reload the page
			setTimeout(() => {
				window.location.reload();
			}, 3000);
		}
	};

	return (
		<div className="container mx-auto p-4 max-w-2xl">
			<div className="mb-4">
				<Link href="/" className="text-blue-500 hover:text-blue-700">
					&larr; 返回日历
				</Link>
			</div>

			<h1 className="text-2xl font-bold mb-6">预约详情</h1>

			{loading ? (
				<div className="flex justify-center items-center h-40">
					<p>加载中...</p>
				</div>
			) : reservation ? (
				<div className="bg-white shadow-md rounded-lg p-6">
					<div className="grid grid-cols-1 gap-4">
						<div className="border-b pb-2">
							<h2 className="text-lg font-semibold">预约ID</h2>
							<p>{reservation.reservationId}</p>
						</div>

						<div className="border-b pb-2">
							<h2 className="text-lg font-semibold">客户姓名</h2>
							<p>{reservation.user ? reservation.user : "未设置"}</p>
						</div>

						<div className="border-b pb-2">
							<h2 className="text-lg font-semibold">预约日期</h2>
							<p>{reservation.date}</p>
						</div>

						<div className="border-b pb-2">
							<h2 className="text-lg font-semibold">时间段</h2>
							<p>{reservation.timeslot}</p>
						</div>

						<div className="border-b pb-2">
							<h2 className="text-lg font-semibold">联系方式</h2>
							<p>
								{reservation.contact ? reservation.contact : "未设置"}
							</p>
						</div>
					</div>

					<div className="mt-6 flex justify-end space-x-4">
						<Button
							className="bg-red-500 text-white"
							onClick={() => setOpenDialog(true)}
						>
							取消预约
						</Button>
					</div>
				</div>
			) : (
				<div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
					<p>未找到预约信息</p>
				</div>
			)}

			{/* 取消预约确认弹窗 */}
			<Dialog open={openDialog} onOpenChange={setOpenDialog}>
				<DialogContent className="bg-white">
					<DialogHeader>
						<DialogTitle>确认取消预约？</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-gray-600">
						取消后将无法恢复，确定要取消这条预约吗？
					</p>
					<DialogFooter className="mt-4">
						<Button
							variant="ghost"
							onClick={() => setOpenDialog(false)}
						>
							取消
						</Button>
						<Button
							variant="destructive"
							className="bg-red-500"
							onClick={handleDelete}
						>
							确认取消
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
