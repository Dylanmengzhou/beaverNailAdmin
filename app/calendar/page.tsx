"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
export default function Home() {

	const [isMobile, setIsMobile] = useState(false);
	const router = useRouter();
	const [checkingAuth, setCheckingAuth] = useState(true)



	// 格式化日期函数
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const koreaDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
		const year = koreaDate.getUTCFullYear();
		const month = String(koreaDate.getUTCMonth() + 1).padStart(
			2,
			"0"
		);
		const day = String(koreaDate.getUTCDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// API 返回的数据类型
	type ApiReservation = {
		name: string | null;
		email: string | null;
		provider: string | null;
		id: string;
		date: string;
		timeSlot: string;
	};

	// Event 显示的数据类型
	type EventData = {
		user: string;
		timeslot: string;
		contact: string;
		date: string;
		reservationId: string;
		provider: string;
	};

	// 状态管理
	const [apiReservations, setApiReservations] = useState<
		ApiReservation[]
	>([]);

	// 获取预约数据
	const handleGetReservation = async () => {
		try {
			const response = await fetch("/api/getNewReservation", {
				method: "GET",
			});
			const data = await response.json();

			if (data.success && Array.isArray(data.message)) {
				setApiReservations(data.message);
				console.log("成功获取预约数据:", data.message);
				toast.success(`成功获取预约数据: ${data.message.length}`, {
					position: "top-center",
					duration: 1000,
				});
			} else {
				console.error("获取预约数据失败:", data.message);
				alert("获取预约数据失败");
			}
		} catch (error) {
			console.error("获取预约数据出错:", error);
			alert("获取预约数据出错");
		}
	};

	// 页面加载时检测设备 + 拉取预约
	useEffect(() => {
		const checkIfMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkIfMobile();
		window.addEventListener("resize", checkIfMobile);
		if (!checkingAuth) {
			// 登录检查完了，再拉预约数据
			handleGetReservation()
		}

		return () => {
			window.removeEventListener("resize", checkIfMobile);
		};
	}, [checkingAuth]);

	useEffect(() => {
		const token = localStorage.getItem('accessToken')
		if (!token) {
			router.push('/')
		} else {
			setCheckingAuth(false) // 有token，认证通过
		}
	}, [])

	if (checkingAuth) {
		return <div className="w-full h-svh flex justify-center items-center">加载中...</div> // 认证状态还没检查完
	}

	// 把 API 数据转成 Calendar 需要的格式
	const apiEventsData: EventData[] = apiReservations.map(
		(reservation) => {
			const hour = parseInt(reservation.timeSlot);
			// 只显示几点开始，不显示结束时间
			const formattedTimeSlot = `${hour}:00`;

			return {
				user: reservation.name ?? "未知用户",
				timeslot: formattedTimeSlot,
				contact: reservation.email ?? "无联系方式",
				date: formatDate(reservation.date),
				reservationId: reservation.id,
				provider: reservation.provider ?? "credentials",
			};
		}
	);

	// 获取provider对应的背景颜色
	const getProviderBgColor = (provider: string): string => {
		switch (provider) {
			case "wechat":
				return "bg-green-500";
			case "google":
				return "bg-blue-500";
			case "kakao":
				return "bg-yellow-500";
			case "credentials":
			default:
				return "bg-pink-500";
		}
	};

	// 渲染事件内容
	const renderEventContent = (eventInfo: {
		event: {
			extendedProps: {
				user: string;
				timeslot: string;
				contact: string;
				reservationId: string;
				provider: string;
			};
		};
	}) => {
		const { user, timeslot, contact, reservationId, provider } =
			eventInfo.event.extendedProps;

		const handleClick = () => {
			router.push(`/reservation/${reservationId}`);
		};

		const providerBgColor = getProviderBgColor(provider);

		return (
			<div
				className={`flex flex-col text-xs p-1 rounded-md ${providerBgColor} text-white`}
				onClick={handleClick}
				style={{ cursor: "pointer" }}
			>
				{isMobile ? (
					<div className="flex flex-col space-y-1 p-0 justify-center items-center">
						<div className="font-bold text-[10px] truncate w-full text-center">
							{user}
						</div>
						<div className="font-medium text-[8px]">
							{timeslot}
						</div>
					</div>
				) : (
					<>
						<div className="flex justify-between">
							<div className="font-semibold truncate mr-1">{user}</div>
							<div>{timeslot}</div>
						</div>
						<div className="flex justify-between">
							<div className="truncate mr-1">{contact}</div>
							<div className="text-[10px]">
								{reservationId.substring(0, 6)}
							</div>
						</div>
					</>
				)}
			</div>
		);
	};

	// 生成 FullCalendar 的 events
	const sampleEvents = apiEventsData.map((event) => ({
		title: "",
		date: event.date,
		extendedProps: {
			user: event.user,
			timeslot: event.timeslot,
			contact: event.contact,
			reservationId: event.reservationId,
			provider: event.provider,
		},
	}));

	return (
		<div className="flex flex-col h-svh justify-center items-center calendar-container">
			<FullCalendar
				plugins={[dayGridPlugin, interactionPlugin]}
				initialView="dayGridMonth"
				weekends={true}
				locale={"zh-cn"}
				headerToolbar={
					isMobile
						? {
							left: "prev,myRefreshButton", // 👈 加一个刷新按钮
							center: "title",
							right: "today,next",
						}
						: {
							left: "prev,next today myRefreshButton", // 👈 桌面版也加
							center: "title",
							right: "dayGridMonth,dayGridWeek,dayGridDay",
						}
				}
				customButtons={{
					myRefreshButton: {
						text: "刷新", // 按钮显示的文字
						click: handleGetReservation, // 👈 点击调用你的拉取 API 函数
					},
				}}
				titleFormat={{
					year: "numeric",
					month: "long",
				}}
				events={sampleEvents}
				eventContent={renderEventContent}
				height="auto"
				contentHeight="auto"
				dayMaxEventRows={isMobile ? 5 : true}
				moreLinkClick="popover"
				fixedWeekCount={false}
				stickyHeaderDates={true}
			/>
		</div>
	);
}
