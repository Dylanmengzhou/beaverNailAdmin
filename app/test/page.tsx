"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
	const [isMobile, setIsMobile] = useState(false);
	const router = useRouter();

	// 检测设备是否为移动端并加载预约数据
	useEffect(() => {
		const checkIfMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkIfMobile();
		window.addEventListener("resize", checkIfMobile);

		// 页面加载时自动获取预约数据
		handleGetReservation();

		return () => {
			window.removeEventListener("resize", checkIfMobile);
		};
	}, []);

	// 格式化日期函数
	const formatDate = (dateString: string) => {
		// API返回的日期格式为ISO字符串，需要提取日期部分
		// 处理时区问题，确保日期显示正确（韩国时区 UTC+9）
		// 创建日期对象并添加9小时以适应韩国时区
		const date = new Date(dateString);
		// 获取韩国时区的日期（UTC+9）
		const koreaDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
		// 获取年、月、日并创建新的日期字符串
		const year = koreaDate.getUTCFullYear();
		const month = String(koreaDate.getUTCMonth() + 1).padStart(
			2,
			"0"
		);
		const day = String(koreaDate.getUTCDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// 定义事件数据类型
	type EventData = {
		user?: string;
		timeslot?: string;
		contact?: string;
		reservationId?: string;
		title?: string;
		date: string;
	};

	// 定义API返回的预约数据类型
	type ApiReservation = {
		id: string;
		date: string;
		timeSlot: string;
		userId: string;
		createdAt: string;
		updatedAt: string;
	};

	// 状态管理API获取的预约数据
	const [apiReservations, setApiReservations] = useState<
		ApiReservation[]
	>([]);

	// 自定义事件内容渲染
	const renderEventContent = (eventInfo: {
		event: {
			extendedProps: {
				user: string;
				timeslot: string;
				contact: string;
				reservationId: string;
			};
		};
	}) => {
		const event = eventInfo.event;

		// 检查是否有扩展属性
		// 使用对象格式的事件数据
		const { user, timeslot, contact, reservationId } =
			event.extendedProps;

		// 处理点击事件，直接在div上绑定
		const handleClick = () => {
			router.push(`/reservation/${reservationId}`);
		};

		return (
			<div
				className="flex flex-col text-xs leading-tight p-0.5"
				onClick={handleClick}
				style={{ cursor: "pointer" }}
			>
				{isMobile ? (
					<div className="flex flex-col text-xs leading-tight p-0.5">
						<div className="font-medium truncate">{user}</div>
					</div>
				) : (
					<>
						<div className="flex justify-between">
							<div className="font-medium truncate mr-1">{user}</div>
							<div className="">{timeslot}</div>
						</div>
						<div className="flex justify-between">
							<div className="truncate mr-1">{contact}</div>
							<div className="text-[10px]">{reservationId}</div>
						</div>
					</>
				)}
			</div>
		);
	};

	// 定义button点击事件，申请后端api并更新日历
	const handleGetReservation = async () => {
		try {
			const response = await fetch("/api/getNewReservation", {
				method: "GET",
			});
			const data = await response.json();

			if (data.success && Array.isArray(data.message)) {
				// 更新API预约数据状态
				setApiReservations(data.message);
				console.log("成功获取预约数据:", data.message);

				// 显示成功提示，但初始加载时不显示
				if (apiReservations.length > 0) {
					alert(`成功获取${data.message.length}条预约数据`);
				}
			} else {
				console.error("获取预约数据失败:", data.message);
				alert("获取预约数据失败");
			}
		} catch (error) {
			console.error("获取预约数据出错:", error);
			alert("获取预约数据出错");
		}
	};

	// 将API预约数据转换为EventData格式
	const apiEventsData: EventData[] = apiReservations.map(
		(reservation) => {
			// 处理时间段格式
			const hour = parseInt(reservation.timeSlot);
			const nextTwoHour = hour + 2;
			const formattedTimeSlot = `${hour}:00-${nextTwoHour}:00`;
			return {
				user: `用户 ${reservation.userId.substring(0, 8)}`, // 截取userId的前8位作为显示名称
				timeslot: formattedTimeSlot, // 转换为时间段格式
				contact: `预约ID: ${reservation.id.substring(0, 8)}`, // 使用预约ID前8位作为联系信息
				reservationId: reservation.id,
				date: formatDate(reservation.date), // 使用格式化函数处理日期
			};
		}
	);

	// 当API数据加载完成时显示提示
	useEffect(() => {
		if (apiReservations.length > 0) {
			console.log(
				`日历已更新，显示 ${apiReservations.length} 条预约数据`
			);
		}
	}, [apiReservations]);

	// 只使用API数据，不再使用示例数据
	const combinedEventsData = apiEventsData;

	// 将事件数据转换为FullCalendar可接受的格式
	const sampleEvents = combinedEventsData.map((event) => ({
		title: "", // 标题留空，由renderEventContent处理
		date: event.date,
		extendedProps: {
			user: event.user,
			timeslot: event.timeslot,
			contact: event.contact,
			reservationId: event.reservationId,
		},
	}));

	return (
		<div
			className={`flex flex-col h-svh justify-center items-center calendar-container `}
		>

			<FullCalendar
				plugins={[dayGridPlugin, interactionPlugin]}
				initialView="dayGridMonth"
				weekends={true}
				locale={"zh-cn"}
				// eventClick属性已移除，改为在renderEventContent中直接绑定点击事件
				headerToolbar={
					isMobile
						? {
								left: "prev,next",
								center: "title",
								right: "today,dayGridMonth,dayGridWeek,dayGridDay",
						  }
						: {
								left: "prev,next today",
								center: "title",
								right: "dayGridMonth,dayGridWeek,dayGridDay",
						  }
				}
				titleFormat={{
					// 自定义标题格式
					year: "numeric",
					month: "long",
				}}
				events={sampleEvents}
				eventContent={renderEventContent}
				height="auto"
				contentHeight="auto"
				aspectRatio={isMobile ? 0.8 : 1.35}
				// 移动端优化 - 确保显示至少5个事件
				dayMaxEventRows={isMobile ? 5 : true}
				moreLinkClick="popover"
				// 改善移动端滑动体验
				fixedWeekCount={false}
				stickyHeaderDates={true}
			/>
		</div>
	);
}
